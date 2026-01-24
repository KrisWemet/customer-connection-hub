alter table public.venue_settings
  add column if not exists damage_deposit_amount numeric(10,2) not null default 500,
  add column if not exists damage_deposit_refund_days integer not null default 7;
