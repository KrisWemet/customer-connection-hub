-- Guests table for client portal guest list management
DO $$
BEGIN
  CREATE TABLE public.guests (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references public.bookings(id) on delete cascade not null,
    first_name text not null,
    last_name text,
    email text,
    phone text,
    rsvp_status text not null default 'pending',
    meal_preference text,
    dietary_restrictions text,
    plus_one boolean default false,
    plus_one_name text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS rsvp_status text;
ALTER TABLE public.guests ALTER COLUMN rsvp_status SET DEFAULT 'pending';
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS meal_preference text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS dietary_restrictions text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS plus_one boolean;
ALTER TABLE public.guests ALTER COLUMN plus_one SET DEFAULT false;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS plus_one_name text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.guests ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.guests ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists idx_guests_booking_id on public.guests(booking_id);
create index if not exists idx_guests_rsvp_status on public.guests(rsvp_status);

-- RLS policies
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Admins can manage guests"
    ON public.guests FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Clients can view own guests"
    ON public.guests FOR SELECT
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
  CREATE POLICY "Clients can manage own guests"
    ON public.guests FOR ALL
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
