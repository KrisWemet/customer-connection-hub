-- Allow clients to view their own contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Clients can view own contracts"
    ON public.contracts FOR SELECT
    TO authenticated
    USING (
      (auth.jwt() ->> 'role' = 'client')
      AND lower(client_email) = lower(auth.jwt() ->> 'email')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
