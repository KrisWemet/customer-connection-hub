-- Remap legacy upsell rows to new overage enum values (safe after enum values exist)
update public.upsells set type = 'rv_site_overage' where type = 'rv_night';
update public.upsells set type = 'tent_camping_overage' where type = 'tent_night';
update public.upsells set type = 'firewood_bundle' where type in ('firewood_shed_refill', 'firewood_wheelbarrow_refill');
