-- Contract status enum
DO $$
BEGIN
  CREATE TYPE public.contract_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Contract number sequence
CREATE SEQUENCE IF NOT EXISTS public.contract_number_seq START 1000;

-- Function to generate contract numbers
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'RR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.contract_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Contracts table
DO $$
BEGIN
  CREATE TABLE public.contracts (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references public.bookings(id) on delete cascade,
    inquiry_id uuid references public.inquiries(id) on delete set null,
    contract_number text unique not null default public.generate_contract_number(),
    status public.contract_status not null default 'draft',
    package_type public.package_type not null,
    event_start_date date not null,
    event_end_date date not null,
    total_amount numeric(10,2) not null,
    deposit_amount numeric(10,2) not null,
    client_name text not null,
    client_email text not null,
    client_phone text,
    sent_at timestamptz,
    viewed_at timestamptz,
    signed_at timestamptz,
    client_ip_address inet,
    client_signature_data text,
    pdf_url text,
    signed_pdf_url text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS inquiry_id uuid;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contract_number text;
ALTER TABLE public.contracts ALTER COLUMN contract_number SET DEFAULT public.generate_contract_number();
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS status public.contract_status;
ALTER TABLE public.contracts ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS package_type public.package_type;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS event_start_date date;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS event_end_date date;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS total_amount numeric(10,2);
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2);
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_at timestamptz;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_ip_address inet;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_signature_data text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_pdf_url text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.contracts ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.contracts ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_booking_id_fkey;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_booking_id_fkey foreign key (booking_id) references public.bookings(id) on delete cascade;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_inquiry_id_fkey;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_inquiry_id_fkey foreign key (inquiry_id) references public.inquiries(id) on delete set null;

create index if not exists idx_contracts_booking_id on public.contracts(booking_id);
create index if not exists idx_contracts_inquiry_id on public.contracts(inquiry_id);
create index if not exists idx_contracts_status on public.contracts(status);

-- RLS (admin only for now)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Admins can manage contracts"
    ON public.contracts FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
