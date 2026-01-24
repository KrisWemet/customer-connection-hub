-- Tours / viewings system
DO $$
BEGIN
  CREATE TYPE public.tour_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.tour_outcome AS ENUM ('interested', 'not_interested', 'booked', 'thinking');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TABLE public.tours (
    id uuid primary key default gen_random_uuid(),
    inquiry_id uuid not null,
    tour_date date not null,
    tour_time time not null,
    attendees jsonb not null default '[]'::jsonb,
    status public.tour_status not null default 'scheduled',
    tour_notes text,
    follow_up_sent boolean not null default false,
    outcome public.tour_outcome,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS inquiry_id uuid;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS tour_date date;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS tour_time time;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS attendees jsonb;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS status public.tour_status;
ALTER TABLE public.tours ALTER COLUMN status SET DEFAULT 'scheduled';
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS tour_notes text;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS follow_up_sent boolean;
ALTER TABLE public.tours ALTER COLUMN follow_up_sent SET DEFAULT false;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS outcome public.tour_outcome;

ALTER TABLE public.tours DROP CONSTRAINT IF EXISTS tours_inquiry_id_fkey;
ALTER TABLE public.tours
  ADD CONSTRAINT tours_inquiry_id_fkey foreign key (inquiry_id) references public.inquiries(id) on delete cascade;

create index if not exists tours_inquiry_id_idx on public.tours(inquiry_id);
create index if not exists tours_date_idx on public.tours(tour_date);
create index if not exists tours_status_idx on public.tours(status);
