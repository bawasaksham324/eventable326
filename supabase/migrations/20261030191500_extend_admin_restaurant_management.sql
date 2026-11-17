create or replace function public.admin_restaurant_reservations()
returns setof jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_eventable_admin() then
    raise exception using message = 'Administrator access is required.';
  end if;

  return query
  select pg_catalog.jsonb_build_object(
    'id', rr.id,
    'customer_name', p.full_name,
    'customer_email', p.email,
    'restaurant_name', r.name,
    'table_number', rt.table_number,
    'reservation_date', rr.reservation_date,
    'reservation_start_at', rr.reservation_start_at,
    'reservation_end_at', rr.reservation_end_at,
    'guest_count', rr.guest_count,
    'phone', rr.phone,
    'status', rr.status,
    'created_at', rr.created_at
  )
  from public.restaurant_reservations rr
  join public.profiles p on p.id = rr.user_id
  join public.restaurants r on r.id = rr.restaurant_id
  join public.restaurant_tables rt on rt.id = rr.table_id
  order by rr.reservation_start_at desc, rr.created_at desc
  limit 500;
end;
$$;

revoke all on function public.admin_restaurant_reservations() from public;
grant execute on function public.admin_restaurant_reservations() to authenticated;

create or replace function public.admin_restaurant_metrics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_eventable_admin() then
    raise exception using message = 'Administrator access is required.';
  end if;

  return pg_catalog.jsonb_build_object(
    'total_reservations', (select count(*) from public.restaurant_reservations),
    'confirmed_reservations', (select count(*) from public.restaurant_reservations where status = 'confirmed'),
    'cancelled_reservations', (select count(*) from public.restaurant_reservations where status = 'deleted'),
    'upcoming_reservations', (
      select count(*)
      from public.restaurant_reservations
      where status = 'confirmed'
        and reservation_start_at >= pg_catalog.now()
    ),
    'upcoming_guests', coalesce((
      select sum(guest_count)
      from public.restaurant_reservations
      where status = 'confirmed'
        and reservation_start_at >= pg_catalog.now()
    ), 0)
  );
end;
$$;

revoke all on function public.admin_restaurant_metrics() from public;
grant execute on function public.admin_restaurant_metrics() to authenticated;
