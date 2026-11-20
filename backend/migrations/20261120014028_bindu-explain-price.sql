-- "Bindu explains" (2026-11-20, owner): a tutor answer played as a whiteboard lesson, written line by
-- line while Bindu reads it aloud. Same Bulbul voice as Listen; voice-speak charges this task when the
-- app asks for purpose 'bindu'. Owner price: Rs 2 (2026-11-20); the lesson voice may read up to 900 characters.
INSERT INTO public.task_prices (task, price_paise, label, sort) VALUES
  ('bindu_explain', 200, 'Bindu explains an answer on the whiteboard', 7)
ON CONFLICT (task) DO UPDATE SET price_paise = EXCLUDED.price_paise, label = EXCLUDED.label, sort = EXCLUDED.sort;
