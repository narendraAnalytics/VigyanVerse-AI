-- Security review 2026-11-17: credit a top-up only when the webhook's environment is the CURRENT
-- payment environment (wallet_settings). Without this, a pending 'test' top-up made before going
-- live could still be paid with test money afterwards and add real credit. Switching the setting
-- also fails every pending top-up of the other environment.
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
  v_env      text;
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
  SELECT payment_environment INTO v_env FROM public.wallet_settings WHERE id;
  IF NOT FOUND OR v_topup.environment <> NEW.environment OR NEW.environment <> v_env THEN
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

CREATE OR REPLACE FUNCTION public.fail_other_environment_topups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.payment_environment IS DISTINCT FROM OLD.payment_environment THEN
    UPDATE public.topups SET status = 'failed' WHERE status = 'pending' AND environment <> NEW.payment_environment;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fail_other_environment_topups() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER wallet_settings_environment_switch
  BEFORE UPDATE ON public.wallet_settings
  FOR EACH ROW EXECUTE FUNCTION public.fail_other_environment_topups();
