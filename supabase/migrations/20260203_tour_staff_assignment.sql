-- Add staff assignment to tours
alter table public.tours
  add column if not exists staff_assigned text;
