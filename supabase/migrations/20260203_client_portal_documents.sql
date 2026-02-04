-- Documents table for client uploads
DO $$
BEGIN
  CREATE TABLE public.documents (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references public.bookings(id) on delete cascade,
    uploaded_by uuid references auth.users(id),
    uploaded_by_role text,
    file_name text not null,
    file_type text,
    file_size integer,
    storage_path text not null,
    description text,
    created_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS uploaded_by_role text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.documents ALTER COLUMN created_at SET DEFAULT now();

create index if not exists idx_documents_booking_id on public.documents(booking_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Admins can manage documents"
    ON public.documents FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Clients can view own documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (
      (auth.jwt() ->> 'role' = 'client')
      AND booking_id IN (
        SELECT id FROM public.bookings b
        WHERE lower(b.client_email) = lower(auth.jwt() ->> 'email')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Clients can upload own documents"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (
      (auth.jwt() ->> 'role' = 'client')
      AND booking_id IN (
        SELECT id FROM public.bookings b
        WHERE lower(b.client_email) = lower(auth.jwt() ->> 'email')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
