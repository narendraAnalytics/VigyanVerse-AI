-- Migration: rupee wallet + Razorpay top-ups (owner 2026-11-17).
--
-- 1 credit = Rs 1, stored as integer PAISE everywhere. No free credits.
--   topup_packs   what a student can buy (price -> credit, bonus on bigger packs)
--   task_prices   what each AI task costs (the Edge Functions charge these)
--   wallets       one balance row per student (never below 0)
--   wallet_ledger append-only history: topup (+), charge (-), refund (+)
--   topups        one row per purchase attempt; its id travels in the Razorpay order notes
--
-- Money in: start_topup(pack) -> app creates the Razorpay order through InsForge (RLS below
-- only allows the student's own subject and a real pack price) -> Checkout -> Razorpay webhook
-- -> payments.webhook_events -> trigger credit_topup_from_webhook() credits the wallet ONCE,
-- only when the paid amount equals the pack price. The browser callback never adds money.
-- Money out: Edge Functions call charge_task() (as the student, locked, fails when the balance is
-- short) before any AI work, and refund_charge() (admin client only) when the AI work failed.

-- ============================================================================
-- Settings: which Razorpay environment real top-ups use ('test' until the owner goes live)
-- ============================================================================
CREATE TABLE public.wallet_settings (
  id                  boolean PRIMARY KEY DEFAULT true CHECK (id),
  payment_environment text NOT NULL DEFAULT 'test' CHECK (payment_environment IN ('test', 'live')),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.wallet_settings (id) VALUES (true);

-- ============================================================================
-- Catalogue: packs and task prices (public read, changed only by migrations / admin)
-- ============================================================================
CREATE TABLE public.topup_packs (
  code         text PRIMARY KEY CHECK (code ~ '^[a-z0-9_]{1,20}$'),
  price_paise  integer NOT NULL CHECK (price_paise BETWEEN 100 AND 1000000),
  credit_paise integer NOT NULL CHECK (credit_paise >= price_paise),
  label        text NOT NULL CHECK (char_length(label) <= 40),
  highlight    boolean NOT NULL DEFAULT false,
  sort         integer NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX topup_packs_active_price_idx ON public.topup_packs (price_paise) WHERE active;

INSERT INTO public.topup_packs (code, price_paise, credit_paise, label, highlight, sort) VALUES
  ('inr_10',  1000,  1000,  'Starter', false, 1),
  ('inr_50',  5000,  5000,  'Regular', false, 2),
  ('inr_100', 10000, 11000, 'Popular', true,  3),
  ('inr_200', 20000, 23000, 'Best value', false, 4);

CREATE TABLE public.task_prices (
  task        text PRIMARY KEY CHECK (task ~ '^[a-z_]{1,30}$'),
  price_paise integer NOT NULL CHECK (price_paise BETWEEN 0 AND 100000),
  label       text NOT NULL CHECK (char_length(label) <= 60),
  sort        integer NOT NULL DEFAULT 0
);

INSERT INTO public.task_prices (task, price_paise, label, sort) VALUES
  ('tutor_turn',     50,  'Ask the tutor a question',      1),
  ('photo_read',     150, 'Read a photo of your notes',    2),
  ('photo_question', 50,  'Ask about a photo',             3),
  ('voice_input',    50,  'Speak your question',           4),
  ('voice_read',     50,  'Hear an answer read aloud',     5),
  ('quiz_batch',     200, 'Quiz, per 5 questions',         6);

-- ============================================================================
-- Wallets, ledger, top-ups
-- ============================================================================
CREATE TABLE public.wallets (
  student_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance_paise integer NOT NULL DEFAULT 0 CHECK (balance_paise >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.topups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_code           text NOT NULL REFERENCES public.topup_packs(code),
  price_paise         integer NOT NULL CHECK (price_paise > 0),
  credit_paise        integer NOT NULL CHECK (credit_paise >= price_paise),
  environment         text NOT NULL CHECK (environment IN ('test', 'live')),
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  razorpay_order_id   text CHECK (char_length(razorpay_order_id) <= 64),
  razorpay_payment_id text CHECK (char_length(razorpay_payment_id) <= 64),
  created_at          timestamptz NOT NULL DEFAULT now(),
  paid_at             timestamptz
);
CREATE INDEX topups_student_created_idx ON public.topups (student_id, created_at DESC);

CREATE TABLE public.wallet_ledger (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind                text NOT NULL CHECK (kind IN ('topup', 'charge', 'refund')),
  delta_paise         integer NOT NULL CHECK (delta_paise <> 0),
  balance_after_paise integer NOT NULL CHECK (balance_after_paise >= 0),
  task                text CHECK (char_length(task) <= 30),
  -- topup: Razorpay payment id; refund: the refunded charge's id; charge: the function's ref
  ref                 text CHECK (char_length(ref) <= 80),
  topup_id            uuid REFERENCES public.topups(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'charge') = (delta_paise < 0))
);
CREATE INDEX wallet_ledger_student_created_idx ON public.wallet_ledger (student_id, created_at DESC);
CREATE INDEX wallet_ledger_topup_id_idx ON public.wallet_ledger (topup_id);
-- One credit per Razorpay payment, one refund per charge.
CREATE UNIQUE INDEX wallet_ledger_topup_ref_idx  ON public.wallet_ledger (ref) WHERE kind = 'topup';
CREATE UNIQUE INDEX wallet_ledger_refund_ref_idx ON public.wallet_ledger (ref) WHERE kind = 'refund';

-- ============================================================================
-- RLS + privileges: students READ their own rows; every write goes through the functions below
-- ============================================================================
ALTER TABLE public.wallet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_packs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_prices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topup_packs: anyone reads active" ON public.topup_packs FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "task_prices: anyone reads" ON public.task_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "wallets: read own" ON public.wallets FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY "topups: read own" ON public.topups FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY "wallet_ledger: read own" ON public.wallet_ledger FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));

REVOKE ALL ON public.wallet_settings, public.topup_packs, public.task_prices, public.wallets, public.topups, public.wallet_ledger FROM anon, authenticated;
GRANT SELECT ON public.topup_packs, public.task_prices TO anon, authenticated;
GRANT SELECT ON public.wallets, public.topups, public.wallet_ledger TO authenticated;

-- ============================================================================
-- start_topup(pack): a pending top-up for the caller. The amount comes from the pack table,
-- never from the client. Returns { topup_id, amount_paise, credit_paise, environment }.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.start_topup(p_pack text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_pack public.topup_packs%ROWTYPE;
  v_env  text;
  v_id   uuid;
  v_open integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students s WHERE s.profile_id = v_uid) THEN
    RAISE EXCEPTION 'students only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_pack FROM public.topup_packs WHERE code = p_pack AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bad_pack' USING ERRCODE = 'P0001';
  END IF;
  -- Spam guard: at most 10 open (pending) top-ups in the last hour.
  SELECT count(*) INTO v_open FROM public.topups
   WHERE student_id = v_uid AND status = 'pending' AND created_at > now() - interval '1 hour';
  IF v_open >= 10 THEN
    RAISE EXCEPTION 'too_many_topups' USING ERRCODE = 'P0001';
  END IF;
  SELECT payment_environment INTO v_env FROM public.wallet_settings WHERE id;

  INSERT INTO public.topups (student_id, pack_code, price_paise, credit_paise, environment)
  VALUES (v_uid, v_pack.code, v_pack.price_paise, v_pack.credit_paise, v_env)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('topup_id', v_id, 'amount_paise', v_pack.price_paise,
                            'credit_paise', v_pack.credit_paise, 'environment', v_env);
END;
$$;
REVOKE ALL ON FUNCTION public.start_topup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_topup(text) TO authenticated;

-- ============================================================================
-- charge_task(task, ref): take a task's price from the caller's wallet, locked, before AI work.
-- Returns { ok, charge_id?, balance_paise, price_paise }. ok=false means "not enough money"
-- (nothing changes). A student calling it directly only spends their own money.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.charge_task(p_task text, p_ref text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_price   integer;
  v_balance integer;
  v_id      bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  SELECT price_paise INTO v_price FROM public.task_prices WHERE task = p_task;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bad_task' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.wallets (student_id) VALUES (v_uid) ON CONFLICT (student_id) DO NOTHING;
  SELECT balance_paise INTO v_balance FROM public.wallets WHERE student_id = v_uid FOR UPDATE;

  IF v_price = 0 THEN
    RETURN jsonb_build_object('ok', true, 'charge_id', NULL, 'balance_paise', v_balance, 'price_paise', 0);
  END IF;
  IF v_balance < v_price THEN
    RETURN jsonb_build_object('ok', false, 'balance_paise', v_balance, 'price_paise', v_price);
  END IF;

  v_balance := v_balance - v_price;
  UPDATE public.wallets SET balance_paise = v_balance, updated_at = now() WHERE student_id = v_uid;
  INSERT INTO public.wallet_ledger (student_id, kind, delta_paise, balance_after_paise, task, ref)
  VALUES (v_uid, 'charge', -v_price, v_balance, p_task, left(p_ref, 80))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'charge_id', v_id, 'balance_paise', v_balance, 'price_paise', v_price);
END;
$$;
REVOKE ALL ON FUNCTION public.charge_task(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.charge_task(text, text) TO authenticated;

-- ============================================================================
-- refund_charge(charge, amount?): give back a charge (all, or part of it) when the AI work
-- failed. Edge Functions call it with the ADMIN client only: no client role may execute it.
-- One refund per charge. Returns { balance_paise, refunded_paise }.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refund_charge(p_charge_id bigint, p_amount_paise integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_charge  public.wallet_ledger%ROWTYPE;
  v_amount  integer;
  v_balance integer;
BEGIN
  SELECT * INTO v_charge FROM public.wallet_ledger WHERE id = p_charge_id AND kind = 'charge';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'charge_not_found' USING ERRCODE = 'P0001';
  END IF;
  v_amount := least(coalesce(p_amount_paise, -v_charge.delta_paise), -v_charge.delta_paise);
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('balance_paise', NULL, 'refunded_paise', 0);
  END IF;

  SELECT balance_paise INTO v_balance FROM public.wallets WHERE student_id = v_charge.student_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.wallet_ledger WHERE kind = 'refund' AND ref = p_charge_id::text) THEN
    RETURN jsonb_build_object('balance_paise', v_balance, 'refunded_paise', 0);
  END IF;

  v_balance := v_balance + v_amount;
  UPDATE public.wallets SET balance_paise = v_balance, updated_at = now() WHERE student_id = v_charge.student_id;
  INSERT INTO public.wallet_ledger (student_id, kind, delta_paise, balance_after_paise, task, ref)
  VALUES (v_charge.student_id, 'refund', v_amount, v_balance, v_charge.task, p_charge_id::text);

  RETURN jsonb_build_object('balance_paise', v_balance, 'refunded_paise', v_amount);
END;
$$;
REVOKE ALL ON FUNCTION public.refund_charge(bigint, integer) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- Fulfilment: credit a top-up from a VERIFIED Razorpay webhook row (InsForge checks the
-- signature before it writes payments.webhook_events). Idempotent: the ledger allows one topup
-- row per payment id, and only a pending / failed top-up can become paid.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.credit_topup_from_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_payment  jsonb;
  v_order    jsonb;
  v_topup_id text;
  v_order_id text;
  v_pay_id   text;
  v_amount   bigint;
  v_topup    public.topups%ROWTYPE;
  v_balance  integer;
BEGIN
  IF NEW.provider <> 'razorpay' OR NEW.processing_status <> 'processed'
     OR NEW.event_type NOT IN ('payment.captured', 'order.paid', 'payment.failed') THEN
    RETURN NEW;
  END IF;

  v_payment  := NEW.payload -> 'payload' -> 'payment' -> 'entity';
  v_order    := NEW.payload -> 'payload' -> 'order' -> 'entity';
  v_pay_id   := v_payment ->> 'id';
  v_order_id := coalesce(v_payment ->> 'order_id', v_order ->> 'id');
  v_topup_id := coalesce(v_payment -> 'notes' ->> 'topup_id', v_order -> 'notes' ->> 'topup_id');
  IF v_topup_id IS NULL AND v_order_id IS NOT NULL THEN
    SELECT o.notes ->> 'topup_id' INTO v_topup_id FROM payments.razorpay_orders o
     WHERE o.order_id = v_order_id ORDER BY o.created_at DESC LIMIT 1;
  END IF;
  IF v_topup_id IS NULL OR v_topup_id !~ '^[0-9a-f-]{36}$' THEN
    RETURN NEW; -- not one of our top-ups
  END IF;

  SELECT * INTO v_topup FROM public.topups WHERE id = v_topup_id::uuid FOR UPDATE;
  IF NOT FOUND OR v_topup.environment <> NEW.environment THEN
    RETURN NEW;
  END IF;

  IF NEW.event_type = 'payment.failed' THEN
    UPDATE public.topups SET status = 'failed', razorpay_order_id = coalesce(razorpay_order_id, v_order_id)
     WHERE id = v_topup.id AND status = 'pending';
    RETURN NEW;
  END IF;

  IF v_topup.status = 'paid' OR v_pay_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_amount := coalesce((v_payment ->> 'amount')::bigint, (v_order ->> 'amount_paid')::bigint);
  IF v_amount IS DISTINCT FROM v_topup.price_paise OR coalesce(v_payment ->> 'currency', 'INR') <> 'INR' THEN
    RAISE WARNING 'topup % amount mismatch (paid %, expected %): not credited', v_topup.id, v_amount, v_topup.price_paise;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_ledger WHERE kind = 'topup' AND ref = v_pay_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wallets (student_id) VALUES (v_topup.student_id) ON CONFLICT (student_id) DO NOTHING;
  SELECT balance_paise INTO v_balance FROM public.wallets WHERE student_id = v_topup.student_id FOR UPDATE;
  v_balance := v_balance + v_topup.credit_paise;
  UPDATE public.wallets SET balance_paise = v_balance, updated_at = now() WHERE student_id = v_topup.student_id;
  INSERT INTO public.wallet_ledger (student_id, kind, delta_paise, balance_after_paise, task, ref, topup_id)
  VALUES (v_topup.student_id, 'topup', v_topup.credit_paise, v_balance, NULL, v_pay_id, v_topup.id);
  UPDATE public.topups SET status = 'paid', paid_at = now(), razorpay_payment_id = v_pay_id,
         razorpay_order_id = coalesce(razorpay_order_id, v_order_id)
   WHERE id = v_topup.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_topup_from_webhook() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER credit_topup_from_webhook
  AFTER INSERT OR UPDATE OF processing_status ON payments.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.credit_topup_from_webhook();

-- ============================================================================
-- Razorpay order creation (InsForge probes INSERT as the student): own subject only, and only
-- the price of an active pack, so nobody pays Rs 1 for a Rs 200 pack or orders for someone else.
-- ============================================================================
ALTER TABLE payments.razorpay_orders ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA payments TO authenticated;
GRANT INSERT ON payments.razorpay_orders TO authenticated;
CREATE POLICY "students create own top-up orders" ON payments.razorpay_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    subject_type = 'user'
    AND subject_id = (SELECT auth.uid())::text
    AND upper(currency) = 'INR'
    AND amount IN (SELECT p.price_paise FROM public.topup_packs p WHERE p.active)
  );
