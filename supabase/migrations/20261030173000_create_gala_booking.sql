create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  venue text not null,
  city text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table if not exists public.event_zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  current_price numeric(10,2) not null
    check (current_price between 500 and 1000),
  capacity integer not null check (capacity > 0),
  unique (event_id, name),
  unique (event_id, id)
);

create table if not exists public.event_seats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  zone_id uuid not null,
  seat_number text not null,
  status text not null default 'available'
    check (status in ('available', 'booked')),
  created_at timestamptz not null default now(),
  unique (event_id, seat_number),
  foreign key (event_id, zone_id)
    references public.event_zones(event_id, id)
    on delete cascade
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  scope text not null check (scope in ('event', 'restaurant', 'both')),
  discount_percent integer not null default 100
    check (discount_percent = 100),
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  event_id uuid not null references public.events(id),
  coupon_id uuid not null references public.coupons(id),
  coupon_code_snapshot text not null,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount_amount numeric(10,2) not null check (discount_amount >= 0),
  total_amount numeric(10,2) not null check (total_amount = 0),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'deleted')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id)
);

create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.event_bookings(id) on delete cascade,
  seat_id uuid not null references public.event_seats(id),
  attendee_name text not null,
  ticket_code text not null unique,
  public_token text not null unique,
  event_name_snapshot text not null,
  zone_name_snapshot text not null,
  seat_number_snapshot text not null,
  ticket_price_snapshot numeric(10,2) not null,
  venue_snapshot text not null,
  start_at_snapshot timestamptz not null,
  end_at_snapshot timestamptz not null,
  status text not null default 'valid'
    check (status in ('valid', 'invalidated')),
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index if not exists event_tickets_valid_seat_unique
  on public.event_tickets (seat_id)
  where status = 'valid';

create index if not exists event_seats_event_status_idx
  on public.event_seats (event_id, status);

create index if not exists event_bookings_user_created_idx
  on public.event_bookings (user_id, created_at desc);

alter table public.events enable row level security;
alter table public.event_zones enable row level security;
alter table public.event_seats enable row level security;
alter table public.coupons enable row level security;
alter table public.event_bookings enable row level security;
alter table public.event_tickets enable row level security;

create policy "Authenticated users can read active events"
  on public.events for select to authenticated
  using (status = 'active');

create policy "Authenticated users can read event zones"
  on public.event_zones for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_zones.event_id and e.status = 'active'
  ));

create policy "Authenticated users can read event seats"
  on public.event_seats for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_seats.event_id and e.status = 'active'
  ));

create policy "Users can read their event bookings"
  on public.event_bookings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their event tickets"
  on public.event_tickets for select to authenticated
  using (exists (
    select 1 from public.event_bookings b
    where b.id = event_tickets.booking_id
      and b.user_id = (select auth.uid())
  ));

revoke all on table public.events from anon, authenticated;
revoke all on table public.event_zones from anon, authenticated;
revoke all on table public.event_seats from anon, authenticated;
revoke all on table public.coupons from anon, authenticated;
revoke all on table public.event_bookings from anon, authenticated;
revoke all on table public.event_tickets from anon, authenticated;
grant select on public.events, public.event_zones, public.event_seats to authenticated;
grant select on public.event_bookings, public.event_tickets to authenticated;

create or replace function public.confirm_event_booking(
  p_event_id uuid,
  p_attendees jsonb,
  p_coupon_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.events%rowtype;
  v_coupon public.coupons%rowtype;
  v_booking_id uuid;
  v_seat_count integer;
  v_attendee_count integer;
  v_subtotal numeric(10,2);
  v_ticket_count integer;
begin
  if v_user_id is null then
    raise exception using message = 'You must be logged in to book tickets.';
  end if;

  if pg_catalog.jsonb_typeof(p_attendees) <> 'array' then
    raise exception using message = 'Ticket attendee details are invalid.';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id and status = 'active'
  for share;

  if not found then
    raise exception using message = 'This event is not available.';
  end if;

  select c.* into v_coupon
  from public.coupons c
  where pg_catalog.upper(pg_catalog.btrim(c.code)) =
    pg_catalog.upper(pg_catalog.btrim(pg_catalog.coalesce(p_coupon_code, '')))
    and c.is_active is true
    and c.deleted_at is null
    and c.discount_percent = 100
    and c.scope in ('event', 'both')
  for share;

  if not found then
    raise exception using message = 'Enter a valid active 100% event coupon.';
  end if;

  select pg_catalog.count(*) into v_attendee_count
  from pg_catalog.jsonb_to_recordset(p_attendees) as a(seat_id uuid, attendee_name text);

  if v_attendee_count < 1 or v_attendee_count > 5 then
    raise exception using message = 'Select between 1 and 5 seats.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_attendees) as a(seat_id uuid, attendee_name text)
    group by a.seat_id
    having pg_catalog.count(*) > 1
  ) then
    raise exception using message = 'Each seat can only be selected once.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_attendees) as a(seat_id uuid, attendee_name text)
    where a.attendee_name is null or pg_catalog.length(pg_catalog.btrim(a.attendee_name)) < 2
  ) then
    raise exception using message = 'Every ticket needs an attendee name.';
  end if;

  select pg_catalog.count(*) into v_seat_count
  from (
    select s.id
    from public.event_seats s
    where s.id in (
      select a.seat_id
      from pg_catalog.jsonb_to_recordset(p_attendees) as a(seat_id uuid, attendee_name text)
    )
    order by s.id
    for update
  ) locked_seats;

  if v_seat_count <> v_attendee_count then
    raise exception using message = 'One or more selected seats no longer exist.';
  end if;

  if exists (
    select 1
    from public.event_seats s
    where s.id in (
      select a.seat_id
      from pg_catalog.jsonb_to_recordset(p_attendees) as a(seat_id uuid, attendee_name text)
    )
    and (s.event_id <> p_event_id or s.status <> 'available')
  ) then
    raise exception using message = 'One or more selected seats are no longer available. Please choose again.';
  end if;

  perform 1
  from public.event_zones z
  where z.id in (
    select s.zone_id
    from public.event_seats s
    where s.id in (
      select a.seat_id
      from pg_catalog.jsonb_to_recordset(p_attendees) as a(seat_id uuid, attendee_name text)
    )
  )
  and z.event_id = p_event_id
  for share;

  select coalesce(pg_catalog.sum(z.current_price), 0) into v_subtotal
  from public.event_seats s
  join public.event_zones z on z.id = s.zone_id
  where s.id in (
    select a.seat_id
    from pg_catalog.jsonb_to_recordset(p_attendees) as a(seat_id uuid, attendee_name text)
  );

  insert into public.event_bookings (
    user_id, event_id, coupon_id, coupon_code_snapshot,
    subtotal, discount_amount, total_amount
  )
  values (
    v_user_id, v_event.id, v_coupon.id, v_coupon.code,
    v_subtotal, v_subtotal, 0
  )
  returning id into v_booking_id;

  insert into public.event_tickets (
    booking_id, seat_id, attendee_name, ticket_code, public_token,
    event_name_snapshot, zone_name_snapshot, seat_number_snapshot,
    ticket_price_snapshot, venue_snapshot, start_at_snapshot, end_at_snapshot
  )
  select
    v_booking_id,
    s.id,
    pg_catalog.btrim(a.attendee_name),
    'EVT-' || pg_catalog.upper(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '')),
    pg_catalog.gen_random_uuid()::text,
    v_event.name,
    z.name,
    s.seat_number,
    z.current_price,
    v_event.venue || ', ' || v_event.city,
    v_event.start_at,
    v_event.end_at
  from pg_catalog.jsonb_to_recordset(p_attendees) as a(seat_id uuid, attendee_name text)
  join public.event_seats s on s.id = a.seat_id
  join public.event_zones z on z.id = s.zone_id;

  get diagnostics v_ticket_count = row_count;

  if v_ticket_count <> v_attendee_count then
    raise exception using message = 'Tickets could not be created. Please try again.';
  end if;

  update public.event_seats
  set status = 'booked'
  where id in (
    select a.seat_id
    from pg_catalog.jsonb_to_recordset(p_attendees) as a(seat_id uuid, attendee_name text)
  );

  return pg_catalog.jsonb_build_object(
    'booking_id', v_booking_id,
    'ticket_count', v_ticket_count,
    'total_amount', 0
  );
end;
$$;

revoke all on function public.confirm_event_booking(uuid, jsonb, text) from public;
grant execute on function public.confirm_event_booking(uuid, jsonb, text) to authenticated;

insert into public.events (id, name, start_at, end_at, venue, city)
values (
  '10000000-0000-0000-0000-000000000001',
  'New Year''s Eve Gala',
  '2026-12-31 22:00:00+05:30',
  '2027-01-01 03:00:00+05:30',
  'The Obsidian Ballroom',
  'Jalandhar, Punjab'
);

insert into public.event_zones (id, event_id, name, current_price, capacity)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Front', 1000, 25),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Premium', 850, 25),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Standard', 700, 25),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Economy', 500, 25);

insert into public.event_seats (event_id, zone_id, seat_number)
select
  '10000000-0000-0000-0000-000000000001',
  z.id,
  case z.name
    when 'Front' then 'F-' || lpad(g::text, 2, '0')
    when 'Premium' then 'P-' || lpad(g::text, 2, '0')
    when 'Standard' then 'S-' || lpad(g::text, 2, '0')
    else 'E-' || lpad(g::text, 2, '0')
  end
from public.event_zones z
cross join generate_series(1, 25) g;

insert into public.coupons (code, scope, discount_percent)
values ('-NOPAYMENTGATEWAY', 'both', 100);
