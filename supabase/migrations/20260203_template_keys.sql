-- Add template keys for CRM email workflows
DO $$
BEGIN
  CREATE TYPE public.template_key AS ENUM (
    'contract_sent',
    'tour_confirmation',
    'payment_reminder',
    'payment_overdue',
    'booking_confirmation',
    'general'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS template_key public.template_key NOT NULL DEFAULT 'general';

create index if not exists templates_key_idx on public.templates(template_key);
