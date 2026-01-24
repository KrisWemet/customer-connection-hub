-- Public read access for contracts bucket
DO $$
BEGIN
  CREATE POLICY "Public read contracts"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'contracts');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Admin-only uploads to contracts bucket
DO $$
BEGIN
  CREATE POLICY "Admin upload contracts"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'contracts'
      AND (auth.jwt() ->> 'role') = 'admin'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Admin-only updates/deletes in contracts bucket
DO $$
BEGIN
  CREATE POLICY "Admin update contracts"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'contracts'
      AND (auth.jwt() ->> 'role') = 'admin'
    )
    WITH CHECK (
      bucket_id = 'contracts'
      AND (auth.jwt() ->> 'role') = 'admin'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Admin delete contracts"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'contracts'
      AND (auth.jwt() ->> 'role') = 'admin'
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
