import { afterEach, describe, expect, it } from 'vitest';
import { pickOrigin, preflight, withCors, json } from '../src/shared/http.ts';

const env = process.env as Record<string, string | undefined>;
afterEach(() => { delete env.ALLOWED_ORIGIN; });

describe('CORS origin list', () => {
  it('echoes an allowed origin and falls back to the first entry', () => {
    env.ALLOWED_ORIGIN = 'http://localhost:3000, https://vigyanverse.vercel.app/';
    expect(pickOrigin('https://vigyanverse.vercel.app')).toBe('https://vigyanverse.vercel.app');
    expect(pickOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    expect(pickOrigin('https://evil.example')).toBe('http://localhost:3000');
    expect(pickOrigin(null)).toBe('http://localhost:3000');
  });

  it('allows any origin when unset or *', () => {
    expect(pickOrigin('https://x.example')).toBe('*');
    env.ALLOWED_ORIGIN = '*';
    expect(pickOrigin('https://x.example')).toBe('*');
  });

  it('sets the caller origin on preflight and on wrapped responses', async () => {
    env.ALLOWED_ORIGIN = 'http://localhost:3000,https://vigyanverse.vercel.app';
    const opts = preflight(new Request('https://f/x', { method: 'OPTIONS', headers: { Origin: 'https://vigyanverse.vercel.app' } }));
    expect(opts?.headers.get('Access-Control-Allow-Origin')).toBe('https://vigyanverse.vercel.app');
    const handler = withCors(async () => json({ ok: true }));
    const res = await handler(new Request('https://f/x', { method: 'POST', headers: { Origin: 'https://vigyanverse.vercel.app' } }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://vigyanverse.vercel.app');
    expect(res.headers.get('Vary')).toBe('Origin');
  });
});
