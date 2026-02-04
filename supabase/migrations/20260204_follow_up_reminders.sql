-- Follow-up reminders table
DO $$
BEGIN
  CREATE TABLE public.follow_up_reminders (
    id uuid primary key default gen_random_uuid(),
    inquiry_id uuid references public.inquiries(id) on delete cascade,
    booking_id uuid references public.bookings(id) on delete cascade,
    reminder_type text not null default 'custom',
    message text not null,
    due_at timestamptz not null,
    is_completed boolean default false,
    completed_at timestamptz,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS inquiry_id uuid;
ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS reminder_type text;
ALTER TABLE public.follow_up_reminders ALTER COLUMN reminder_type SET DEFAULT 'custom';
ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS is_completed boolean;
ALTER TABLE public.follow_up_reminders ALTER COLUMN is_completed SET DEFAULT false;
ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.follow_up_reminders ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.follow_up_reminders ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.follow_up_reminders ALTER COLUMN updated_at SET DEFAULT now();

create index if not exists idx_follow_up_reminders_inquiry_id on public.follow_up_reminders(inquiry_id);
create index if not exists idx_follow_up_reminders_booking_id on public.follow_up_reminders(booking_id);
create index if not exists idx_follow_up_reminders_due_at on public.follow_up_reminders(due_at);
create index if not exists idx_follow_up_reminders_is_completed on public.follow_up_reminders(is_completed);

-- RLS policies
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Admins can manage follow-up reminders"
    ON public.follow_up_reminders FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Function to auto-create follow-up reminders based on inquiry status
CREATE OR REPLACE FUNCTION public.create_status_reminder()
RETURNS TRIGGER AS $$
DECLARE
  reminder_message text;
  due_date timestamptz;
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Create appropriate reminder based on new status
  CASE NEW.status
    WHEN 'contacted' THEN
      reminder_message := 'Follow up with ' || NEW.full_name || ' in 3 days';
      due_date := now() + INTERVAL '3 days';
    WHEN 'tour_scheduled' THEN
      reminder_message := 'Send tour follow-up to ' || NEW.full_name;
      due_date := now() + INTERVAL '1 day';
    WHEN 'proposal_sent' THEN
      reminder_message := 'Check in with ' || NEW.full_name || ' about proposal';
      due_date := now() + INTERVAL '5 days';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.follow_up_reminders (
    inquiry_id,
    reminder_type,
    message,
    due_at,
    is_completed
  ) VALUES (
    NEW.id,
    CASE NEW.status
      WHEN 'contacted' THEN 'no_contact'
      WHEN 'tour_scheduled' THEN 'tour_followup'
      WHEN 'proposal_sent' THEN 'proposal_followup'
      ELSE 'custom'
    END,
    reminder_message,
    due_date,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create reminders on status change
DROP TRIGGER IF EXISTS auto_create_follow_up_reminder ON public.inquiries;
CREATE TRIGGER auto_create_follow_up_reminder
  AFTER UPDATE OF status ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.create_status_reminder();

-- Function to create "no contact" reminders for stale inquiries
CREATE OR REPLACE FUNCTION public.create_no_contact_reminders()
RETURNS void AS $$
BEGIN
  INSERT INTO public.follow_up_reminders (inquiry_id, reminder_type, message, due_at, is_completed)
  SELECT 
    i.id,
    'no_contact',
    'No contact in 7+ days: Follow up with ' || i.full_name,
    now(),
    false
  FROM public.inquiries i
  WHERE i.status IN ('inquiry', 'contacted', 'tour_scheduled', 'proposal_sent')
    AND i.updated_at < now() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.follow_up_reminders r
      WHERE r.inquiry_id = i.id
        AND r.reminder_type = 'no_contact'
        AND r.is_completed = false
        AND r.created_at > now() - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql;

-- To run manually or via cron: SELECT public.create_no_contact_reminders();
