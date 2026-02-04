-- Planning checklist items table
DO $$
BEGIN
  CREATE TABLE public.checklist_items (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references public.bookings(id) on delete cascade not null,
    title text not null,
    description text,
    due_date date,
    category text,
    is_completed boolean default false,
    completed_at timestamptz,
    sort_order integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS is_completed boolean;
ALTER TABLE public.checklist_items ALTER COLUMN is_completed SET DEFAULT false;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS sort_order integer;
ALTER TABLE public.checklist_items ALTER COLUMN sort_order SET DEFAULT 0;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.checklist_items ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.checklist_items ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists idx_checklist_items_booking_id on public.checklist_items(booking_id);
create index if not exists idx_checklist_items_due_date on public.checklist_items(due_date);
create index if not exists idx_checklist_items_is_completed on public.checklist_items(is_completed);

-- RLS policies
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Admins can manage checklist items"
    ON public.checklist_items FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Clients can view own checklist items"
    ON public.checklist_items FOR SELECT
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
  CREATE POLICY "Clients can manage own checklist items"
    ON public.checklist_items FOR ALL
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

-- Seed default checklist items for new bookings
CREATE OR REPLACE FUNCTION public.seed_default_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.checklist_items (booking_id, title, description, category, sort_order, due_date)
  VALUES
    (NEW.id, 'Book ceremony officiant', 'Secure your officiant and confirm ceremony details', 'Ceremony', 1, NEW.start_date::date - INTERVAL '6 months'),
    (NEW.id, 'Choose wedding party attire', 'Select and order attire for wedding party', 'Attire', 2, NEW.start_date::date - INTERVAL '4 months'),
    (NEW.id, 'Send save-the-dates', 'Notify guests of your wedding date', 'Guests', 3, NEW.start_date::date - INTERVAL '6 months'),
    (NEW.id, 'Send formal invitations', 'Mail wedding invitations with RSVP deadline', 'Guests', 4, NEW.start_date::date - INTERVAL '3 months'),
    (NEW.id, 'Finalize menu with caterer', 'Confirm meal selections and dietary accommodations', 'Catering', 5, NEW.start_date::date - INTERVAL '2 months'),
    (NEW.id, 'Order wedding cake', 'Design and order your wedding cake', 'Catering', 6, NEW.start_date::date - INTERVAL '2 months'),
    (NEW.id, 'Book photographer/videographer', 'Secure your photography and video team', 'Vendors', 7, NEW.start_date::date - INTERVAL '8 months'),
    (NEW.id, 'Book florist', 'Design floral arrangements and bouquets', 'Vendors', 8, NEW.start_date::date - INTERVAL '4 months'),
    (NEW.id, 'Book DJ or band', 'Confirm music and entertainment', 'Vendors', 9, NEW.start_date::date - INTERVAL '4 months'),
    (NEW.id, 'Plan rehearsal dinner', 'Organize dinner for wedding party and family', 'Events', 10, NEW.start_date::date - INTERVAL '1 month'),
    (NEW.id, 'Final guest count', 'Submit final headcount to venue and caterer', 'Guests', 11, NEW.start_date::date - INTERVAL '2 weeks'),
    (NEW.id, 'Create seating chart', 'Plan table arrangements for reception', 'Guests', 12, NEW.start_date::date - INTERVAL '3 weeks'),
    (NEW.id, 'Pick up marriage license', 'Obtain legal marriage license', 'Legal', 13, NEW.start_date::date - INTERVAL '1 month'),
    (NEW.id, 'Confirm vendor arrivals', 'Touch base with all vendors on timing', 'Vendors', 14, NEW.start_date::date - INTERVAL '1 week'),
    (NEW.id, 'Pack for honeymoon', 'Prepare for your getaway', 'Travel', 15, NEW.start_date::date - INTERVAL '1 week');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-seed checklist on new booking (optional - can be enabled per venue preference)
-- DROP TRIGGER IF EXISTS seed_checklist_on_booking ON public.bookings;
-- CREATE TRIGGER seed_checklist_on_booking
--   AFTER INSERT ON public.bookings
--   FOR EACH ROW
--   EXECUTE FUNCTION public.seed_default_checklist();
