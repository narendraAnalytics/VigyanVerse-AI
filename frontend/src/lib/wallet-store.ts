'use client';

// The student's rupee wallet (1 credit = Rs 1, stored in paise) and the Razorpay top-up flow.
// The backend owns every number here: Edge Functions charge `task_prices` before AI work and
// refund failures; a top-up is credited only by the verified Razorpay webhook (database trigger),
// never by this file. The app shows the balance, the packs and the prices, and opens Checkout.
import { createStore } from './store';
import { insforge, publicClient } from './insforge';

export interface Pack { code: string; price_paise: number; credit_paise: number; label: string; highlight: boolean }
export interface TaskPrice { task: string; price_paise: number; label: string }
export interface LedgerRow { id: number; kind: 'topup' | 'charge' | 'refund'; delta_paise: number; balance_after_paise: number; task: string | null; created_at: string }

export type PayPhase = 'idle' | 'starting' | 'paying' | 'confirming' | 'done' | 'slow' | 'cancelled' | 'failed';

export const wallet = createStore({
  /** null until the first read (or when signed out). */
  balancePaise: null as number | null,
  packs: [] as Pack[],
  prices: [] as TaskPrice[],
  activity: [] as LedgerRow[],
  activityLoaded: false,
  /** The Add-money sheet. `need` is set when a task was refused for money. */
  sheetOpen: false,
  need: null as { pricePaise: number; balancePaise: number } | null,
  selected: 'inr_100',
  phase: 'idle' as PayPhase,
  payError: null as string | null,
  lastCreditPaise: 0,
});

// ---------------------------------------------------------------------------
// Money helpers
// ---------------------------------------------------------------------------
/** ₹12.50, ₹110, ₹0.50 */
export function rupees(paise: number): string {
  const r = paise / 100;
  return `₹${Number.isInteger(r) ? r.toLocaleString('en-IN') : r.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Colour band of a balance: emerald from Rs 50, amber Rs 10-49.99, red under Rs 10, grey at 0. */
export type Tone = 'good' | 'mid' | 'low' | 'empty';
export function toneOf(paise: number): Tone {
  if (paise <= 0) return 'empty';
  if (paise < 1000) return 'low';
  if (paise < 5000) return 'mid';
  return 'good';
}

export const TASK_LABEL: Record<string, string> = {
  tutor_turn: 'Tutor question', photo_read: 'Photo read', photo_question: 'Photo question',
  voice_input: 'Voice question', voice_read: 'Answer read aloud', quiz_batch: 'Quiz (5 questions)',
};

/** Price of a task in paise (falls back to the published defaults until the table is read). */
const DEFAULT_PRICES: Record<string, number> = { tutor_turn: 50, photo_read: 150, photo_question: 50, voice_input: 50, voice_read: 50, quiz_batch: 200 };
export function priceOf(task: string): number {
  return wallet.get().prices.find((p) => p.task === task)?.price_paise ?? DEFAULT_PRICES[task] ?? 0;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
let catalogue: Promise<void> | null = null;
/** Packs and prices are public: read once per page load. */
export function loadCatalogue(): Promise<void> {
  catalogue ??= (async () => {
    const db = publicClient().database;
    const [packs, prices] = await Promise.all([
      db.from('topup_packs').select('code, price_paise, credit_paise, label, highlight').order('sort'),
      db.from('task_prices').select('task, price_paise, label').order('sort'),
    ]);
    if (packs.error || prices.error) { catalogue = null; return; }
    wallet.set({ packs: (packs.data as Pack[]) ?? [], prices: (prices.data as TaskPrice[]) ?? [] });
  })();
  return catalogue;
}

export async function refreshBalance(): Promise<void> {
  const { data, error } = await insforge().database.from('wallets').select('balance_paise').limit(1);
  if (error) return;
  wallet.set({ balancePaise: (data as { balance_paise: number }[] | null)?.[0]?.balance_paise ?? 0 });
}

export async function loadActivity(): Promise<void> {
  const { data, error } = await insforge().database.from('wallet_ledger')
    .select('id, kind, delta_paise, balance_after_paise, task, created_at')
    .order('created_at', { ascending: false }).limit(20);
  if (!error) wallet.set({ activity: (data as LedgerRow[]) ?? [], activityLoaded: true });
}

/** Signed in: balance + catalogue. Signed out: forget the balance. */
export function syncWallet(signedIn: boolean) {
  if (!signedIn) { wallet.set({ balancePaise: null, activity: [], activityLoaded: false, sheetOpen: false }); return; }
  void refreshBalance();
  void loadCatalogue();
}

/** Every paid Edge Function returns the balance after its charge (or refund). */
export function noteBalance(paise: unknown) {
  if (typeof paise === 'number' && Number.isFinite(paise)) wallet.set({ balancePaise: paise });
}

// ---------------------------------------------------------------------------
// The Add-money sheet
// ---------------------------------------------------------------------------
export function openAddMoney(need?: { pricePaise: number; balancePaise: number }) {
  void loadCatalogue();
  const s = wallet.get();
  // Pre-select the smallest pack that covers what is missing (the Rs 100 pack otherwise).
  let selected = s.selected;
  if (need) {
    const missing = need.pricePaise - need.balancePaise;
    selected = s.packs.find((p) => p.credit_paise >= missing && p.price_paise >= 5000)?.code ?? selected;
  }
  wallet.set({ sheetOpen: true, need: need ?? null, selected, phase: 'idle', payError: null });
}

export function closeAddMoney() {
  const p = wallet.get().phase;
  if (p === 'starting' || p === 'confirming') return; // let the payment finish first
  wallet.set({ sheetOpen: false, need: null, phase: 'idle', payError: null });
}

/** Can the student afford `paise` right now? Unknown balance -> let the server decide. */
export function canAfford(paise: number): boolean {
  const b = wallet.get().balancePaise;
  return b === null || b >= paise;
}

// ---------------------------------------------------------------------------
// Razorpay Checkout
// ---------------------------------------------------------------------------
interface RazorpaySuccess { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
interface RazorpayInstance { open(): void; on(event: string, fn: (r: unknown) => void): void }
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

let checkoutScript: Promise<RazorpayCtor> | null = null;
function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  checkoutScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error('checkout missing')));
    s.onerror = () => { checkoutScript = null; reject(new Error('checkout blocked')); };
    document.head.appendChild(s);
  });
  return checkoutScript;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait for the webhook to credit the top-up (usually a few seconds). */
async function waitForCredit(topupId: string): Promise<'paid' | 'failed' | 'slow'> {
  const db = insforge().database;
  for (let i = 0; i < 20; i++) {
    await sleep(i < 5 ? 1500 : 3000);
    const { data } = await db.from('topups').select('status').eq('id', topupId).limit(1);
    const status = (data as { status: string }[] | null)?.[0]?.status;
    if (status === 'paid') return 'paid';
    if (status === 'failed' && i > 6) return 'failed';
  }
  return 'slow';
}

export async function buyPack(user: { id: string; email?: string | null; name?: string | null }) {
  const s = wallet.get();
  if (s.phase === 'starting' || s.phase === 'paying' || s.phase === 'confirming') return;
  const pack = s.packs.find((p) => p.code === s.selected);
  if (!pack) return;
  wallet.set({ phase: 'starting', payError: null });

  try {
    const client = insforge();
    const started = await client.database.rpc('start_topup', { p_pack: pack.code });
    if (started.error || !started.data) {
      const msg = (started.error as { message?: string } | null)?.message ?? '';
      throw new Error(msg.includes('too_many') ? 'too_many' : msg.includes('students only') ? 'bookplate' : 'start');
    }
    const t = started.data as { topup_id: string; amount_paise: number; credit_paise: number; environment: 'test' | 'live' };

    const order = await client.payments.razorpay.createOrder(t.environment, {
      amount: t.amount_paise,
      currency: 'INR',
      subject: { type: 'user', id: user.id },
      description: `VigyanVerse wallet: ${rupees(t.credit_paise)}`,
      customerEmail: user.email ?? null,
      customerName: user.name ?? null,
      notes: { topup_id: t.topup_id },
    });
    if (order.error || !order.data) throw new Error('order');

    const Razorpay = await loadCheckout();
    wallet.set({ phase: 'paying' });
    await new Promise<void>((resolve) => {
      let settled = false;
      const rzp = new Razorpay({
        ...order.data!.checkoutOptions,
        name: 'VigyanVerse AI',
        description: `Add ${rupees(t.credit_paise)} to your wallet`,
        image: `${window.location.origin}/logo.png`,
        notes: { topup_id: t.topup_id },
        theme: { color: '#1f5f5b', backdrop_color: 'rgba(16, 43, 41, 0.72)' },
        handler: async (r: RazorpaySuccess) => {
          settled = true;
          wallet.set({ phase: 'confirming' });
          // Signature check (authentic callback). The money itself is added by the webhook.
          await client.payments.razorpay.verifyOrder(t.environment, { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).catch(() => null);
          const result = await waitForCredit(t.topup_id);
          await Promise.all([refreshBalance(), loadActivity()]);
          if (result === 'paid') wallet.set({ phase: 'done', lastCreditPaise: t.credit_paise, need: null });
          else if (result === 'slow') wallet.set({ phase: 'slow', lastCreditPaise: t.credit_paise });
          else wallet.set({ phase: 'failed', payError: 'The bank did not confirm this payment. If money was taken, it is returned automatically by the bank.' });
          resolve();
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            if (settled) return;
            wallet.set({ phase: 'cancelled', payError: null });
            resolve();
          },
        },
      });
      rzp.open();
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    wallet.set({
      phase: 'failed',
      payError: code === 'too_many' ? 'Too many unfinished payments. Wait a little and try again.'
        : code === 'bookplate' ? 'Fill in your bookplate first (name, board and class), then top up.'
        : code.startsWith('checkout') ? 'The payment window could not load. Check your connection (or ad blocker) and try again.'
        : 'Could not start the payment. Try again in a moment.',
    });
  }
}
