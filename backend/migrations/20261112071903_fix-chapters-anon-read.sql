-- Fix: "chapters: public read active" referenced public.is_admin(), which anon has
-- no EXECUTE privilege on, so every anonymous chapters query failed with 42501.
-- Rule going forward: policies granted TO anon must not call authenticated-only helpers.

DROP POLICY "chapters: public read active" ON public.chapters;

CREATE POLICY "chapters: public read active" ON public.chapters
  FOR SELECT TO anon, authenticated
  USING (is_active);

CREATE POLICY "chapters: admin read all" ON public.chapters
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
