-- Timeline events table for client weekend schedule
DO $$
BEGIN
  CREATE TABLE public.timeline_events (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references public.bookings(id) on delete cascade not null,
    event_date date not null,
    start_time time not null,
    end_time time,
    title text not null,
    description text,
    location text,
    vendor_id uuid references public.contacts(id) on delete set null,
    status text default 'planned',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS event_date date;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS end_time time;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.timeline_events ALTER COLUMN status SET DEFAULT 'planned';
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.timeline_events ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.timeline_events ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists idx_timeline_events_booking_id on public.timeline_events(booking_id);
create index if not exists idx_timeline_events_event_date on public.timeline_events(event_date);

-- RLS policies
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Admins can manage timeline events"
    ON public.timeline_events FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Clients can view own timeline events"
    ON public.timeline_events FOR SELECT
    TO authenticated
    USING (
      (auth.jwt() ->> 'role' = 'client')
      AND booking_id IN (
        SELECT id FROM public.bookings
        WHERE lower(client_email) = lower(auth.jwt() ->> 'email')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Clients can manage own timeline events"
    ON public.timeline_events FOR ALL
    TO authenticated
    USING (
      (auth.jwt() ->> 'role' = 'client')
      AND booking_id IN (
        SELECT id FROM public.bookings
        WHERE lower(client_email) = lower(auth.jwt() ->> 'email')
      )
    )
    WITH CHECK (
      (auth.jwt() ->> 'role' = 'client')
      AND booking_id IN (
        SELECT id FROM public.bookings
        WHERE lower(client_email) = lower(auth.jwt() ->> 'email')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
