-- Add additional package types
alter type public.package_type add value if not exists '5_day_extended';
alter type public.package_type add value if not exists '10_day_experience';

-- Seed/ensure venue_settings has all three base prices (idempotent upsert style)
update public.venue_settings
set package_base_prices = jsonb_build_object(
  '3_day_weekend', 4500,
  '5_day_extended', 5500,
  '10_day_experience', 8500
)
where package_base_prices is null
   or package_base_prices ? '5_day_extended' = false
   or package_base_prices ? '10_day_experience' = false;
