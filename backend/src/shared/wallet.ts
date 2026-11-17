// Rupee wallet (migration wallet-and-topups): every paid AI task is charged BEFORE the model call
// and refunded when the AI work failed, so a student never pays for nothing and can never get a
// paid answer on an empty wallet (charge_task locks the wallet row).
//
//   const charge = await chargeTask(db, 'tutor_turn', ref);
//   if (!charge.ok) return chargeFailed(charge);
//   ... AI work ...  on failure: await refundCharge(charge);
//   success: json({ ..., balancePaise: charge.balancePaise })
import { createAdminClient } from '@insforge/sdk';
import { requireEnv } from './env.ts';
import { json } from './http.ts';

/** Task codes in public.task_prices (prices live in the database, not here). */
export type PaidTask = 'tutor_turn' | 'photo_read' | 'photo_question' | 'voice_input' | 'voice_read' | 'quiz_batch';

export type Charge =
  | { ok: true; chargeId: number | null; balancePaise: number; pricePaise: number }
  | { ok: false; error: 'no_credits'; balancePaise: number; pricePaise: number }
  | { ok: false; error: 'wallet_failed' };

interface RpcDb {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

/** Take the task's price from the caller's wallet (user-scoped client: the wallet is the caller's). */
export async function chargeTask(db: RpcDb, task: PaidTask, ref?: string): Promise<Charge> {
  const res = await db.rpc('charge_task', { p_task: task, p_ref: ref ?? null });
  const row = res.data as { ok?: boolean; charge_id?: number | null; balance_paise?: number; price_paise?: number } | null;
  if (res.error || !row || typeof row.balance_paise !== 'number' || typeof row.price_paise !== 'number') {
    return { ok: false, error: 'wallet_failed' };
  }
  if (row.ok !== true) return { ok: false, error: 'no_credits', balancePaise: row.balance_paise, pricePaise: row.price_paise };
  return { ok: true, chargeId: row.charge_id ?? null, balancePaise: row.balance_paise, pricePaise: row.price_paise };
}

/** The response for a failed charge: 402 with the numbers the app shows ("you need Rs 0.50, you have Rs 0.20"). */
export function chargeFailed(charge: Exclude<Charge, { ok: true }>): Response {
  if (charge.error === 'no_credits') {
    return json({ error: 'no_credits', balancePaise: charge.balancePaise, pricePaise: charge.pricePaise }, 402);
  }
  return json({ error: 'wallet_failed' }, 500);
}

let adminDb: RpcDb | null = null;
function admin(): RpcDb {
  adminDb ??= createAdminClient({ baseUrl: requireEnv('INSFORGE_BASE_URL'), apiKey: requireEnv('API_KEY') }).database;
  return adminDb;
}

/**
 * Give a charge back (all of it, or `amountPaise` of it) after the AI work failed. Only the admin
 * client may call refund_charge. Never throws: a failed refund is logged (ids only) and the
 * balance from the charge is returned unchanged.
 */
export async function refundCharge(charge: Extract<Charge, { ok: true }>, amountPaise?: number, db: RpcDb = admin()): Promise<number> {
  if (charge.chargeId === null || charge.pricePaise === 0) return charge.balancePaise;
  try {
    const res = await db.rpc('refund_charge', { p_charge_id: charge.chargeId, p_amount_paise: amountPaise ?? null });
    const row = res.data as { balance_paise?: number | null } | null;
    if (res.error) throw new Error('rpc error');
    return typeof row?.balance_paise === 'number' ? row.balance_paise : charge.balancePaise;
  } catch {
    console.error(`wallet: refund failed for charge ${charge.chargeId}`);
    return charge.balancePaise;
  }
}
