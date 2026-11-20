-- Owner prices 2026-11-20: "Bindu explains" Rs 3 (was Rs 2) and Listen Rs 1 (was Rs 0.50), so voice work never
-- runs at a loss. Bulbul v4 Flash costs Rs 1 per 1,000 characters (API pricing docs) or Rs 2 (product page),
-- + 18% GST: a 900-character lesson can cost up to about Rs 2.12 and a 600-character Listen about Rs 1.42.
UPDATE public.task_prices SET price_paise = 300 WHERE task = 'bindu_explain';
UPDATE public.task_prices SET price_paise = 100 WHERE task = 'voice_read';
