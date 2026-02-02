-- Phase 1 core CRM tables (inquiries, proposals, invoices, templates, calendar blocks, communication logs)
create extension if not exists pgcrypto;

-- Enums
DO $$
BEGIN
  CREATE TYPE public.inquiry_status AS ENUM (
    'inquiry',
    'contacted',
    'tour_scheduled',
    'proposal_sent',
    'booked',
    'completed',
    'declined',
    'hold'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.calendar_block_type AS ENUM ('hold', 'blocked', 'maintenance');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.proposal_status AS ENUM ('draft', 'sent', 'accepted', 'expired', 'declined');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.template_type AS ENUM ('email', 'sms', 'document');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.communication_channel AS ENUM ('email', 'sms', 'note');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.communication_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.communication_status AS ENUM ('logged', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Inquiries
DO $$
BEGIN
  CREATE TABLE public.inquiries (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    email text,
    phone text,
    source text,
    status public.inquiry_status not null default 'inquiry',
    event_start_date date,
    event_end_date date,
    estimated_guest_count integer,
    notes text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS status public.inquiry_status;
ALTER TABLE public.inquiries ALTER COLUMN status SET DEFAULT 'inquiry';
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS event_start_date date;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS event_end_date date;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS estimated_guest_count integer;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.inquiries ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.inquiries ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists inquiries_status_idx on public.inquiries(status);
create index if not exists inquiries_event_start_idx on public.inquiries(event_start_date);

-- Calendar blocks (availability)
DO $$
BEGIN
  CREATE TABLE public.calendar_blocks (
    id uuid primary key default gen_random_uuid(),
    type public.calendar_block_type not null default 'hold',
    start_date date not null,
    end_date date not null,
    label text,
    notes text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS type public.calendar_block_type;
ALTER TABLE public.calendar_blocks ALTER COLUMN type SET DEFAULT 'hold';
ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.calendar_blocks ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.calendar_blocks ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.calendar_blocks ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists calendar_blocks_date_idx on public.calendar_blocks(start_date, end_date);

-- Proposals
DO $$
BEGIN
  CREATE TABLE public.proposals (
    id uuid primary key default gen_random_uuid(),
    inquiry_id uuid references public.inquiries(id) on delete set null,
    booking_id uuid references public.bookings(id) on delete set null,
    title text,
    status public.proposal_status not null default 'draft',
    total_amount numeric(10,2),
    pdf_url text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS inquiry_id uuid;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS status public.proposal_status;
ALTER TABLE public.proposals ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS total_amount numeric(10,2);
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.proposals ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.proposals ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists proposals_status_idx on public.proposals(status);

-- Invoices
DO $$
BEGIN
  CREATE TABLE public.invoices (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references public.bookings(id) on delete set null,
    amount numeric(10,2) not null default 0,
    status public.invoice_status not null default 'draft',
    due_date date,
    paid_at timestamptz,
    provider_invoice_id text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount numeric(10,2);
ALTER TABLE public.invoices ALTER COLUMN amount SET DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status public.invoice_status;
ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS provider_invoice_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.invoices ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.invoices ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_booking_id_idx on public.invoices(booking_id);

-- Templates
DO $$
BEGIN
  CREATE TABLE public.templates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    type public.template_type not null default 'email',
    subject text,
    body text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS type public.template_type;
ALTER TABLE public.templates ALTER COLUMN type SET DEFAULT 'email';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.templates ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.templates ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists templates_type_idx on public.templates(type);

-- Communication logs
DO $$
BEGIN
  CREATE TABLE public.communication_logs (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references public.bookings(id) on delete set null,
    inquiry_id uuid references public.inquiries(id) on delete set null,
    channel public.communication_channel not null default 'note',
    direction public.communication_direction not null default 'outbound',
    subject text,
    body text,
    status public.communication_status not null default 'logged',
    provider text,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS inquiry_id uuid;
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS channel public.communication_channel;
ALTER TABLE public.communication_logs ALTER COLUMN channel SET DEFAULT 'note';
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS direction public.communication_direction;
ALTER TABLE public.communication_logs ALTER COLUMN direction SET DEFAULT 'outbound';
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS status public.communication_status;
ALTER TABLE public.communication_logs ALTER COLUMN status SET DEFAULT 'logged';
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.communication_logs ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.communication_logs ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists communication_logs_created_idx on public.communication_logs(created_at desc);

-- RLS policies (admin only for now)
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Admins manage inquiries" ON public.inquiries
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Admins manage calendar blocks" ON public.calendar_blocks
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Admins manage proposals" ON public.proposals
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Admins manage invoices" ON public.invoices
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Admins manage templates" ON public.templates
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Admins manage communication logs" ON public.communication_logs
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
