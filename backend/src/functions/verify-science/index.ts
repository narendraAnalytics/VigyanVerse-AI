// Edge Function: deterministic Science verification (no LLM call, no DB write).
// POST { kind: 'balance' | 'check-equation', equation }
// POST { kind: 'numeric', student, expected, relTol? }
import { z } from 'zod';
import { authenticate, json, preflight } from '../../shared/http.ts';
import { balanceEquation, checkBalanced } from '../../verify/chemistry.ts';
import { compareNumericAnswer } from '../../verify/numeric.ts';

const Body = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('balance'), equation: z.string().min(3).max(300) }),
  z.object({ kind: z.literal('check-equation'), equation: z.string().min(3).max(300) }),
  z.object({
    kind: z.literal('numeric'),
    student: z.string().min(1).max(100),
    expected: z.string().min(1).max(100),
    relTol: z.number().min(0).max(0.2).optional(),
  }),
]);

export default async function (req: Request): Promise<Response> {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await authenticate(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
  const body = parsed.data;

  try {
    switch (body.kind) {
      case 'balance':
        return json(balanceEquation(body.equation));
      case 'check-equation':
        return json(checkBalanced(body.equation));
      case 'numeric':
        return json(compareNumericAnswer(body.student, body.expected, body.relTol));
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Verification failed' }, 422);
  }
}
