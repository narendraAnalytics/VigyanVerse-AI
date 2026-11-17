import { describe, expect, it, vi } from 'vitest';
import { chargeFailed, chargeTask, refundCharge } from '../src/shared/wallet.ts';

const dbReturning = (data: unknown, error: unknown = null) => ({ rpc: vi.fn(async () => ({ data, error })) });

describe('wallet', () => {
  it('charges and returns the new balance', async () => {
    const db = dbReturning({ ok: true, charge_id: 7, balance_paise: 950, price_paise: 50 });
    const c = await chargeTask(db, 'tutor_turn', 'conv-1');
    expect(c).toEqual({ ok: true, chargeId: 7, balancePaise: 950, pricePaise: 50 });
    expect(db.rpc).toHaveBeenCalledWith('charge_task', { p_task: 'tutor_turn', p_ref: 'conv-1' });
  });

  it('reports not enough money with both numbers, as HTTP 402', async () => {
    const c = await chargeTask(dbReturning({ ok: false, balance_paise: 20, price_paise: 50 }), 'tutor_turn');
    expect(c).toEqual({ ok: false, error: 'no_credits', balancePaise: 20, pricePaise: 50 });
    if (c.ok) throw new Error('unreachable');
    const res = chargeFailed(c);
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: 'no_credits', balancePaise: 20, pricePaise: 50 });
  });

  it('fails closed when the wallet cannot be read', async () => {
    expect(await chargeTask(dbReturning(null, { message: 'boom' }), 'quiz_batch')).toEqual({ ok: false, error: 'wallet_failed' });
    expect(await chargeTask(dbReturning({ ok: true }), 'quiz_batch')).toEqual({ ok: false, error: 'wallet_failed' });
  });

  it('refunds a failed task (whole or part) with the admin db', async () => {
    const admin = dbReturning({ balance_paise: 1000, refunded_paise: 50 });
    const bal = await refundCharge({ ok: true, chargeId: 7, balancePaise: 950, pricePaise: 50 }, undefined, admin);
    expect(bal).toBe(1000);
    expect(admin.rpc).toHaveBeenCalledWith('refund_charge', { p_charge_id: 7, p_amount_paise: null });
    await refundCharge({ ok: true, chargeId: 8, balancePaise: 800, pricePaise: 200 }, 80, admin);
    expect(admin.rpc).toHaveBeenLastCalledWith('refund_charge', { p_charge_id: 8, p_amount_paise: 80 });
  });

  it('never refunds a free task, and a failed refund keeps the charged balance', async () => {
    const admin = dbReturning(null, { message: 'down' });
    expect(await refundCharge({ ok: true, chargeId: null, balancePaise: 500, pricePaise: 0 }, undefined, admin)).toBe(500);
    expect(admin.rpc).not.toHaveBeenCalled();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await refundCharge({ ok: true, chargeId: 9, balancePaise: 450, pricePaise: 50 }, undefined, admin)).toBe(450);
    spy.mockRestore();
  });
});
