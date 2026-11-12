-- Storage access control for the two private buckets (created with the CLI:
-- `storage create-bucket <name> --private`; buckets are not created here).
--
--   curriculum       licensed textbook PDFs. App admins only (is_admin()).
--                    Ingestion scripts use the project API key, which bypasses RLS.
--   student-uploads  key = '<auth uid>/...'. The owner may read, overwrite and delete
--                    their own folder. Writing (insert/update) additionally requires the
--                    student's parental 'document_upload' consent. Delete never needs
--                    consent, so a student can always remove their own data.
--
-- Any bucket not named here has no end-user access (admin/API key only).
-- Follows the InsForge storage RLS guide (storage.objects is the managed table that
-- may carry custom policies). Never make either bucket public: direct GETs on a
-- public bucket bypass RLS.

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- The auto-installed owner-only defaults are not bucket-scoped: they would let any
-- signed-in user upload into 'curriculum'. Replace them.
DROP POLICY IF EXISTS storage_objects_owner_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_delete ON storage.objects;

-- ---------------------------------------------------------------------------
-- student-uploads: path-scoped, owner only
-- ---------------------------------------------------------------------------
CREATE POLICY student_uploads_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket = 'student-uploads'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY student_uploads_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'student-uploads'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
    AND (SELECT public.has_consent((SELECT auth.uid()), 'document_upload'))
  );

CREATE POLICY student_uploads_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket = 'student-uploads'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    bucket = 'student-uploads'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
    AND (SELECT public.has_consent((SELECT auth.uid()), 'document_upload'))
  );

CREATE POLICY student_uploads_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket = 'student-uploads'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  );

-- ---------------------------------------------------------------------------
-- curriculum: app admins only (all four operations)
-- ---------------------------------------------------------------------------
CREATE POLICY curriculum_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket = 'curriculum' AND (SELECT public.is_admin()));

CREATE POLICY curriculum_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket = 'curriculum' AND (SELECT public.is_admin()));

CREATE POLICY curriculum_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING      (bucket = 'curriculum' AND (SELECT public.is_admin()))
  WITH CHECK (bucket = 'curriculum' AND (SELECT public.is_admin()));

CREATE POLICY curriculum_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket = 'curriculum' AND (SELECT public.is_admin()));

-- ---------------------------------------------------------------------------
-- Privileges: policies do not replace grants. anon gets nothing.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
REVOKE ALL ON storage.objects FROM anon;
