create extension if not exists btree_gist;

create table if not exists public.restaurants (
  id uuid primary key default public.gen_random_uuid(),
  name text not null,
  cuisine text not null,
  description text not null,
  location text not null,
  opening_hours text not null,
  image_path text not null,
  reservation_fee_per_person numeric(10,2) not null default 500
    check (reservation_fee_per_person >= 0),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default pg_catalog.now()
);

create table if not exists public.restaurant_tables (
  id uuid primary key default public.gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_number text not null,
  capacity integer not null check (capacity between 1 and 20),
  created_at timestamptz not null default pg_catalog.now(),
  unique (restaurant_id, table_number)
);

create table if not exists public.restaurant_reservations (
  id uuid primary key default public.gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  restaurant_id uuid not null references public.restaurants(id),
  table_id uuid not null references public.restaurant_tables(id),
  coupon_id uuid not null references public.coupons(id),
  coupon_code_snapshot text not null,
  phone text not null,
  reservation_date date not null,
  reservation_start_at timestamptz not null,
  reservation_end_at timestamptz not null,
  guest_count integer not null check (guest_count between 1 and 20),
  original_fee_per_person_snapshot numeric(10,2) not null check (original_fee_per_person_snapshot >= 0),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount_amount numeric(10,2) not null check (discount_amount >= 0),
  total_amount numeric(10,2) not null check (total_amount = 0),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'deleted')),
  created_at timestamptz not null default pg_catalog.now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  check (reservation_end_at = reservation_start_at + interval '90 minutes'),
  check (reservation_end_at > reservation_start_at)
);

alter table public.restaurant_reservations
  add constraint restaurant_reservations_no_overlap
  exclude using gist (
    table_id with =,
    tstzrange(reservation_start_at, reservation_end_at, '[)') with &&
  )
  where (status = 'confirmed');

create index if not exists restaurant_reservations_user_created_idx
  on public.restaurant_reservations (user_id, created_at desc);

create index if not exists restaurant_reservations_restaurant_start_idx
  on public.restaurant_reservations (restaurant_id, reservation_start_at);

alter table public.restaurants enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.restaurant_reservations enable row level security;

revoke all on table public.restaurants, public.restaurant_tables, public.restaurant_reservations from anon, authenticated;
grant select on public.restaurants, public.restaurant_tables to authenticated;
grant select on public.restaurant_reservations to authenticated;

create policy "Authenticated users can read active restaurants"
  on public.restaurants for select to authenticated
  using (status = 'active');

create policy "Authenticated users can read restaurant tables"
  on public.restaurant_tables for select to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = restaurant_tables.restaurant_id and r.status = 'active'
  ));

create policy "Users can read their restaurant reservations"
  on public.restaurant_reservations for select to authenticated
  using ((select auth.uid()) = user_id);

insert into public.restaurants (
  name, cuisine, description, location, opening_hours, image_path, reservation_fee_per_person
)
select
  'Neon Lounge',
  'Contemporary Indian & Global',
  'A late-night dining room for slow plates, bright cocktails, and conversations that stay past midnight.',
  'Jalandhar, Punjab',
  'Daily · 6:00 PM – 12:00 AM',
  '/assets/images/restaurant-neon-interior.jpg',
  500
where not exists (select 1 from public.restaurants where name = 'Neon Lounge');

insert into public.restaurant_tables (restaurant_id, table_number, capacity)
select r.id, seed.table_number, seed.capacity
from public.restaurants r
cross join (values
  ('T01', 2), ('T02', 2), ('T03', 2), ('T04', 2),
  ('T05', 4), ('T06', 4), ('T07', 4),
  ('T08', 6), ('T09', 8), ('T10', 10)
) as seed(table_number, capacity)
where r.name = 'Neon Lounge'
  and not exists (
    select 1 from public.restaurant_tables t
    where t.restaurant_id = r.id and t.table_number = seed.table_number
  );

create or replace function public.get_restaurant_availability(
  p_restaurant_id uuid,
  p_reservation_date date,
  p_guest_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_guest_count is null or p_guest_count < 1 or p_guest_count > 20 then
    raise exception using message = 'Party size must be between 1 and 20.';
  end if;

  if not exists (
    select 1 from public.restaurants
    where id = p_restaurant_id and status = 'active'
  ) then
    raise exception using message = 'Restaurant is not available.';
  end if;

  select coalesce(pg_catalog.jsonb_agg(slot_data order by slot_start), '[]'::jsonb)
  into v_result
  from (
    select
      slot_start,
      pg_catalog.jsonb_build_object(
        'start_at', slot_start,
        'end_at', slot_start + interval '90 minutes',
        'label', to_char(slot_start at time zone 'Asia/Kolkata', 'HH12:MI AM'),
        'available', exists (
          select 1
          from public.restaurant_tables rt
          where rt.restaurant_id = p_restaurant_id
            and rt.capacity >= p_guest_count
            and not exists (
              select 1
              from public.restaurant_reservations rr
              where rr.table_id = rt.id
                and rr.status = 'confirmed'
                and tstzrange(rr.reservation_start_at, rr.reservation_end_at, '[)')
                    && tstzrange(slot_start, slot_start + interval '90 minutes', '[)')
            )
        )
      ) as slot_data
    from generate_series(
      (p_reservation_date + time '18:00') at time zone 'Asia/Kolkata',
      (p_reservation_date + time '22:30') at time zone 'Asia/Kolkata',
      interval '30 minutes'
    ) as slot_start
  ) slots;

  return v_result;
end;
$$;

revoke all on function public.get_restaurant_availability(uuid, date, integer) from public;
grant execute on function public.get_restaurant_availability(uuid, date, integer) to authenticated;

create or replace function public.confirm_restaurant_reservation(
  p_restaurant_id uuid,
  p_reservation_date date,
  p_start_time time,
  p_guest_count integer,
  p_phone text,
  p_coupon_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_restaurant public.restaurants%rowtype;
  v_coupon public.coupons%rowtype;
  v_table public.restaurant_tables%rowtype;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_subtotal numeric(10,2);
  v_reservation public.restaurant_reservations%rowtype;
begin
  if v_user_id is null then
    raise exception using message = 'You must be signed in to reserve a table.';
  end if;
  if p_guest_count is null or p_guest_count < 1 or p_guest_count > 20 then
    raise exception using message = 'Party size must be between 1 and 20.';
  end if;
  if p_phone is null or p_phone !~ '^[+]?[0-9 ()-]{7,20}$' then
    raise exception using message = 'Enter a valid phone number.';
  end if;
  if p_start_time < time '18:00' or p_start_time > time '22:30'
     or extract(minute from p_start_time)::integer not in (0, 30) then
    raise exception using message = 'Choose one of the available 30-minute slots.';
  end if;

  select * into v_restaurant
  from public.restaurants
  where id = p_restaurant_id and status = 'active'
  for share;
  if not found then
    raise exception using message = 'Restaurant is not available.';
  end if;

  v_start_at := (p_reservation_date + p_start_time) at time zone 'Asia/Kolkata';
  v_end_at := v_start_at + interval '90 minutes';

  select * into v_coupon
  from public.coupons
  where pg_catalog.upper(pg_catalog.btrim(code)) = pg_catalog.upper(pg_catalog.btrim(p_coupon_code))
    and is_active = true
    and deleted_at is null
    and discount_percent = 100
    and scope in ('restaurant', 'both')
  for share;
  if not found then
    raise exception using message = 'A valid active 100% restaurant coupon is required.';
  end if;

  select rt.* into v_table
  from public.restaurant_tables rt
  where rt.restaurant_id = p_restaurant_id
    and rt.capacity >= p_guest_count
    and not exists (
      select 1 from public.restaurant_reservations rr
      where rr.table_id = rt.id
        and rr.status = 'confirmed'
        and tstzrange(rr.reservation_start_at, rr.reservation_end_at, '[)')
            && tstzrange(v_start_at, v_end_at, '[)')
    )
  order by rt.capacity, rt.table_number
  for update skip locked
  limit 1;

  if not found then
    raise exception using message = 'No suitable table is available for that time.';
  end if;

  v_subtotal := v_restaurant.reservation_fee_per_person * p_guest_count;

  insert into public.restaurant_reservations (
    user_id, restaurant_id, table_id, coupon_id, coupon_code_snapshot, phone,
    reservation_date, reservation_start_at, reservation_end_at, guest_count,
    original_fee_per_person_snapshot, subtotal, discount_amount, total_amount
  )
  values (
    v_user_id, v_restaurant.id, v_table.id, v_coupon.id, v_coupon.code, pg_catalog.btrim(p_phone),
    p_reservation_date, v_start_at, v_end_at, p_guest_count,
    v_restaurant.reservation_fee_per_person, v_subtotal, v_subtotal, 0
  )
  returning * into v_reservation;

  return pg_catalog.jsonb_build_object(
    'reservation_id', v_reservation.id,
    'restaurant_name', v_restaurant.name,
    'table_number', v_table.table_number,
    'reservation_start_at', v_start_at,
    'reservation_end_at', v_end_at,
    'guest_count', p_guest_count,
    'total_amount', 0
  );
end;
$$;

revoke all on function public.confirm_restaurant_reservation(uuid, date, time, integer, text, text) from public;
grant execute on function public.confirm_restaurant_reservation(uuid, date, time, integer, text, text) to authenticated;

create or replace function public.cancel_restaurant_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.restaurant_reservations%rowtype;
begin
  select * into v_reservation
  from public.restaurant_reservations
  where id = p_reservation_id
    and user_id = (select auth.uid())
  for update;
  if not found then
    raise exception using message = 'Reservation was not found.';
  end if;
  if v_reservation.status = 'deleted' then
    return pg_catalog.jsonb_build_object('reservation_id', v_reservation.id, 'status', 'deleted');
  end if;

  update public.restaurant_reservations
  set status = 'deleted', deleted_at = pg_catalog.now(), deleted_by = (select auth.uid())
  where id = v_reservation.id;

  return pg_catalog.jsonb_build_object('reservation_id', v_reservation.id, 'status', 'deleted');
end;
$$;

revoke all on function public.cancel_restaurant_reservation(uuid) from public;
grant execute on function public.cancel_restaurant_reservation(uuid) to authenticated;

create or replace function public.get_my_restaurant_reservations()
returns setof public.restaurant_reservations
language sql
security invoker
set search_path = ''
as $$
  select *
  from public.restaurant_reservations
  where user_id = (select auth.uid())
  order by created_at desc
$$;

revoke all on function public.get_my_restaurant_reservations() from public;
grant execute on function public.get_my_restaurant_reservations() to authenticated;

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
  join public.restaurants r on r.id = rr.restaurant_id
  join public.restaurant_tables rt on rt.id = rr.table_id
  order by rr.created_at desc
  limit 100;
end;
$$;

revoke all on function public.admin_restaurant_reservations() from public;
grant execute on function public.admin_restaurant_reservations() to authenticated;

create or replace function public.admin_cancel_restaurant_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.restaurant_reservations%rowtype;
begin
  if not public.is_eventable_admin() then
    raise exception using message = 'Administrator access is required.';
  end if;

  select * into v_reservation
  from public.restaurant_reservations
  where id = p_reservation_id
  for update;
  if not found then
    raise exception using message = 'Reservation was not found.';
  end if;

  if v_reservation.status = 'deleted' then
    return pg_catalog.jsonb_build_object('reservation_id', v_reservation.id, 'status', 'deleted');
  end if;

  update public.restaurant_reservations
  set status = 'deleted', deleted_at = pg_catalog.now(), deleted_by = (select auth.uid())
  where id = v_reservation.id;

  insert into public.admin_audit_logs (admin_id, action, affected_entity, entity_id)
  values ((select auth.uid()), 'cancel_restaurant_reservation', 'restaurant_reservation', v_reservation.id);

  return pg_catalog.jsonb_build_object('reservation_id', v_reservation.id, 'status', 'deleted');
end;
$$;

revoke all on function public.admin_cancel_restaurant_reservation(uuid) from public;
grant execute on function public.admin_cancel_restaurant_reservation(uuid) to authenticated;
