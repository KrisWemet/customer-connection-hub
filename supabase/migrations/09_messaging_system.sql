-- Contacts
DO $$
BEGIN
    CREATE TYPE public.contact_type AS ENUM ('client', 'vendor', 'lead');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TABLE public.contacts (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text,
      phone text,
      contact_type public.contact_type not null default 'lead',
      booking_id uuid,
      notes text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
EXCEPTION
    WHEN duplicate_table THEN NULL;
END $$;

-- Ensure columns/constraints exist even if table pre-existed
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS contact_type public.contact_type;
ALTER TABLE public.contacts ALTER COLUMN contact_type SET DEFAULT 'lead';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_booking_id_fkey;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_booking_id_fkey foreign key (booking_id) references public.bookings(id) on delete set null;

create index if not exists contacts_booking_id_idx on public.contacts(booking_id);
create index if not exists contacts_type_idx on public.contacts(contact_type);

-- Threads
DO $$
BEGIN
    CREATE TABLE public.message_threads (
      id uuid primary key default gen_random_uuid(),
      contact_id uuid references public.contacts(id) on delete cascade,
      subject text,
      last_message_at timestamptz,
      unread_count integer not null default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
EXCEPTION
    WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS contact_id uuid;
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS last_message_at timestamptz;
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS unread_count integer;
ALTER TABLE public.message_threads ALTER COLUMN unread_count SET DEFAULT 0;
ALTER TABLE public.message_threads DROP CONSTRAINT IF EXISTS message_threads_contact_id_fkey;
ALTER TABLE public.message_threads
  ADD CONSTRAINT message_threads_contact_id_fkey foreign key (contact_id) references public.contacts(id) on delete cascade;

create index if not exists message_threads_contact_id_idx on public.message_threads(contact_id);
create index if not exists message_threads_last_message_at_idx on public.message_threads(last_message_at desc);

-- Messages
DO $$
BEGIN
    CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.message_channel AS ENUM ('sms', 'email', 'facebook_messenger');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'failed', 'read');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TABLE public.messages (
      id uuid primary key default gen_random_uuid(),
      thread_id uuid references public.message_threads(id) on delete cascade,
      direction public.message_direction not null,
      channel public.message_channel not null,
      from_address text,
      to_address text,
      subject text,
      body text not null,
      status public.message_status not null default 'sent',
      external_id text,
      sent_by uuid,
      sent_at timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
EXCEPTION
    WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS thread_id uuid;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS direction public.message_direction;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS channel public.message_channel;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS from_address text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS to_address text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status public.message_status;
ALTER TABLE public.messages ALTER COLUMN status SET DEFAULT 'sent';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sent_by uuid;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_thread_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_thread_id_fkey foreign key (thread_id) references public.message_threads(id) on delete cascade;

create index if not exists messages_thread_id_idx on public.messages(thread_id);
create index if not exists messages_status_idx on public.messages(status);
create index if not exists messages_created_at_idx on public.messages(created_at desc);
