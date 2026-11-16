-- Image chats keep their history (owner 2026-11-16).
--
-- A conversation can belong to one uploaded image. Questions about that image, both the ones the
-- document-ask agent answers from the image text and the "solve it" ones tutor-chat answers, are
-- saved into that one conversation, so opening the image again shows its earlier answers.
--
-- * One conversation per image (unique), only the student's own image (policy check).
-- * Deleting the image deletes its chat too: the student message of a solve contains the
--   image's text, and "delete this image" should leave none of it behind.
-- * messages.agent gains 'docqa' (answers from the image text).

ALTER TABLE public.conversations
  ADD COLUMN document_id uuid REFERENCES public.uploaded_documents(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX conversations_document_id_key
  ON public.conversations (document_id) WHERE document_id IS NOT NULL;

-- Create only your own conversations, linked (if at all) to your own image.
DROP POLICY "conversations: create own" ON public.conversations;
CREATE POLICY "conversations: create own" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND (
      document_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.uploaded_documents d
        WHERE d.id = document_id AND d.owner_id = (SELECT auth.uid())
      )
    )
  );

-- document_id is set once, at creation (no UPDATE grant on it).
GRANT INSERT (document_id) ON public.conversations TO authenticated;

ALTER TABLE public.messages DROP CONSTRAINT messages_agent_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_agent_check
  CHECK (agent IN ('router', 'tutor', 'socratic', 'math', 'docqa'));
