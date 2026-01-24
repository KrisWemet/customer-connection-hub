-- Add client contact fields and RV site count to bookings
alter table public.bookings
  add column if not exists client_name text,
  add column if not exists client_email text,
  add column if not exists rv_sites integer default 0;
