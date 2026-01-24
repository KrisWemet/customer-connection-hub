-- Schema customization for Rustic Retreat (Alberta) venue settings, pricing, and deposits
create extension if not exists pgcrypto;

-- Package type narrowed to single weekend package
do $$
begin
  if not exists (select 1 from pg_type where typname = 'package_type') then
    create type public.package_type as enum ('3_day_weekend');
  end if;
end$$;

alter table public.bookings
  alter column package_type type public.package_type using (
    case
      when package_type in ('3_day_weekend', '3-day', '3_day') then '3_day_weekend'::public.package_type
      else '3_day_weekend'::public.package_type
    end
  ),
  alter column package_type set default '3_day_weekend';

alter table public.bookings
  add column if not exists is_last_minute boolean not null default false;

-- Upsell enum: add overage types safely to existing enum, then remap rows
alter type public.upsell_type add value if not exists 'rv_site_overage';
alter type public.upsell_type add value if not exists 'tent_camping_overage';
alter type public.upsell_type add value if not exists 'firewood_bundle';

-- Damage deposit table and status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'damage_deposit_status') then
    create type public.damage_deposit_status as enum ('pending', 'collected', 'refunded', 'deducted', 'waived');
  end if;
end$$;

create table if not exists public.damage_deposits (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  amount numeric(10,2) not null default 500,
  status public.damage_deposit_status not null default 'pending',
  collected_at timestamptz,
  refunded_at timestamptz,
  deductions numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists damage_deposits_booking_id_idx on public.damage_deposits(booking_id);

-- Venue settings singleton for easy year-over-year updates
create table if not exists public.venue_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Rustic Retreat Weddings and Events',
  business_address text not null default 'Lac Saint Anne County, Alberta, Canada',
  timezone text not null default 'America/Edmonton',
  max_reception_guests integer not null default 150,
  included_camping_guests integer not null default 60,
  included_rv_sites integer not null default 15,
  season_start date not null default '2026-06-01',
  season_end date not null default '2026-09-30',
  deposit_percent numeric(5,4) not null default 0.25,
  payment_offsets jsonb not null default '{"deposit":0,"second":-90,"final":-60}',
  package_base_prices jsonb not null default '{"3_day_weekend":4500,"5_day_extended":5500,"10_day_experience":8500}',
  upsell_unit_prices jsonb not null default '{"rv_site_overage":25,"tent_camping_overage":15,"firewood_bundle":20}',
  gst_rate numeric(4,3) not null default 0.05,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists venue_settings_singleton_idx on public.venue_settings ((true));

insert into public.venue_settings (business_name)
values ('Rustic Retreat Weddings and Events')
on conflict do nothing;
