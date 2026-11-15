-- Migration M7b: strict storage_key on uploaded_documents (fix forward for M7).
-- The M7 check only compared the first path segment, so '<uid>/../<other uid>/x' would pass, and
-- document-process reads the object with the admin client. Allow only '<uid>/<segment>[/<segment>]'
-- where a segment is letters, digits, '.', '_' or '-', and is never '.' or '..'.
-- (document-process also re-checks the key and that the object exists in the bucket.)
ALTER TABLE public.uploaded_documents
  ADD CONSTRAINT uploaded_documents_storage_key_strict CHECK (
    storage_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(/[A-Za-z0-9._-]+)+$'
    AND storage_key !~ '(^|/)\.\.?(/|$)'
  );
