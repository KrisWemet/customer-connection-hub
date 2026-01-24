-- Payment schedule table to track installments and Stripe intents
create table if not exists public.payment_schedule (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  installment_order integer not null,
  label text not null,
  amount numeric(10,2) not null,
  due_date date not null,
  stripe_payment_intent_id text,
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists payment_schedule_booking_idx on public.payment_schedule(booking_id);
create index if not exists payment_schedule_due_idx on public.payment_schedule(due_date);
