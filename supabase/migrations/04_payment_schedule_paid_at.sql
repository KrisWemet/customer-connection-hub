alter table public.payment_schedule
  add column if not exists paid_at timestamptz;
