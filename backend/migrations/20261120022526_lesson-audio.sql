-- Saved "Bindu explains" lessons (2026-11-20, owner): a lesson's audio is paid once (bindu_explain) and kept,
-- so the student can watch it again later, on any device, for free. Bindu's voice reading the tutor answer is
-- stored; students' own voice recordings are still never stored.
--
--   bucket lesson-audio   PRIVATE (created with `storage create-bucket lesson-audio --private`), key
--                         '<student uid>/<message id>.mp3'. Students may READ and DELETE their own folder;
--                         only voice-speak (admin client) writes, so nothing else can be uploaded here.
--   lesson_audio          one row per saved lesson (the tutor message it explains), written by voice-speak with
--                         the admin client after it checked, as the student, that the message is theirs.
--                         Cascades with the message / conversation / student. Deleting an account must also
--                         remove the student's lesson-audio objects (see backend/CLAUDE.md).

CREATE TABLE public.lesson_audio (
  message_id  bigint PRIMARY KEY REFERENCES public.messages(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.students(profile_id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE CHECK (char_length(storage_key) BETWEEN 3 AND 200),
  mime        text NOT NULL DEFAULT 'audio/mpeg' CHECK (mime ~ '^audio/[a-z0-9.+-]{1,40}$'),
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  greeting    text NOT NULL CHECK (char_length(greeting) <= 300),
  spoken_text text NOT NULL CHECK (char_length(spoken_text) BETWEEN 1 AND 1200),
  size_bytes  integer CHECK (size_bytes BETWEEN 1 AND 5000000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lesson_audio_student_idx ON public.lesson_audio (student_id);

ALTER TABLE public.lesson_audio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_audio: read own" ON public.lesson_audio
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));

REVOKE ALL ON public.lesson_audio FROM anon, authenticated;
GRANT SELECT ON public.lesson_audio TO authenticated;

-- Storage: own folder, read + delete only (no client insert / update policy: admin writes only).
CREATE POLICY lesson_audio_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket = 'lesson-audio'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY lesson_audio_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket = 'lesson-audio'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  );
