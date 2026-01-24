-- Ensure special_requests/notes remain nullable (safety)
alter table public.bookings
  alter column special_requests drop not null;
