create or replace function public.is_eventable_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_eventable_admin() from public;
grant execute on function public.is_eventable_admin() to authenticated;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  affected_entity text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;
revoke all on table public.admin_audit_logs from anon, authenticated;
grant select on table public.admin_audit_logs to authenticated;

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs"
  on public.admin_audit_logs for select to authenticated
  using (public.is_eventable_admin());

drop policy if exists "Admins can read all event bookings" on public.event_bookings;
create policy "Admins can read all event bookings"
  on public.event_bookings for select to authenticated
  using (public.is_eventable_admin());

drop policy if exists "Admins can read all event tickets" on public.event_tickets;
create policy "Admins can read all event tickets"
  on public.event_tickets for select to authenticated
  using (public.is_eventable_admin());

drop policy if exists "Admins can read all event seats" on public.event_seats;
create policy "Admins can read all event seats"
  on public.event_seats for select to authenticated
  using (public.is_eventable_admin());

drop policy if exists "Admins can read all events" on public.events;
create policy "Admins can read all events"
  on public.events for select to authenticated
  using (public.is_eventable_admin());

drop policy if exists "Admins can read all event zones" on public.event_zones;
create policy "Admins can read all event zones"
  on public.event_zones for select to authenticated
  using (public.is_eventable_admin());

drop policy if exists "Admins can read coupons" on public.coupons;
create policy "Admins can read coupons"
  on public.coupons for select to authenticated
  using (public.is_eventable_admin());

create or replace function public.admin_dashboard_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_eventable_admin() then
    raise exception using message = 'Administrator access is required.';
  end if;

  select pg_catalog.jsonb_build_object(
    'metrics', pg_catalog.jsonb_build_object(
      'total_bookings', (select count(*) from public.event_bookings),
      'total_tickets', (select count(*) from public.event_tickets),
      'booked_seats', (select count(*) from public.event_seats where status = 'booked'),
      'available_seats', (select count(*) from public.event_seats where status = 'available'),
      'total_events', (select count(*) from public.events)
    ),
    'recent_bookings', coalesce((
      select pg_catalog.jsonb_agg(row_data order by created_at desc)
      from (
        select
          b.created_at,
          pg_catalog.jsonb_build_object(
            'id', b.id,
            'event_id', b.event_id,
            'event_name', e.name,
            'attendee_count', (select count(*) from public.event_tickets t where t.booking_id = b.id),
            'status', b.status,
            'created_at', b.created_at,
            'ticket_codes', (
              select coalesce(pg_catalog.jsonb_agg(t.ticket_code order by t.ticket_code), '[]'::jsonb)
              from public.event_tickets t where t.booking_id = b.id
            )
          ) as row_data
        from public.event_bookings b
        join public.events e on e.id = b.event_id
        order by b.created_at desc
        limit 50
      ) recent
    ), '[]'::jsonb),
    'inventory', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'event_id', e.id,
        'event_name', e.name,
        'zone_id', z.id,
        'zone_name', z.name,
        'price', z.current_price,
        'booked', (select count(*) from public.event_seats s where s.zone_id = z.id and s.status = 'booked'),
        'available', (select count(*) from public.event_seats s where s.zone_id = z.id and s.status = 'available')
      ) order by e.name, z.name)
      from public.events e
      join public.event_zones z on z.event_id = e.id
    ), '[]'::jsonb),
    'coupons', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'scope', c.scope,
        'discount_percent', c.discount_percent,
        'is_active', c.is_active,
        'deleted_at', c.deleted_at
      ) order by c.code)
      from public.coupons c
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_data() from public;
grant execute on function public.admin_dashboard_data() to authenticated;

create or replace function public.admin_verify_ticket(p_ticket_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket record;
begin
  if not public.is_eventable_admin() then
    raise exception using message = 'Administrator access is required.';
  end if;

  select
    t.ticket_code,
    t.attendee_name,
    t.event_name_snapshot,
    t.zone_name_snapshot,
    t.seat_number_snapshot,
    t.venue_snapshot,
    t.start_at_snapshot,
    t.end_at_snapshot,
    t.status,
    t.checked_in,
    t.checked_in_at,
    b.id as booking_id,
    b.status as booking_status
  into v_ticket
  from public.event_tickets t
  join public.event_bookings b on b.id = t.booking_id
  where pg_catalog.upper(t.ticket_code) = pg_catalog.upper(pg_catalog.btrim(p_ticket_code));

  if not found then
    raise exception using message = 'Ticket code was not found.';
  end if;

  return pg_catalog.to_jsonb(v_ticket);
end;
$$;

revoke all on function public.admin_verify_ticket(text) from public;
grant execute on function public.admin_verify_ticket(text) to authenticated;

create or replace function public.admin_check_in_ticket(p_ticket_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.event_tickets%rowtype;
begin
  if not public.is_eventable_admin() then
    raise exception using message = 'Administrator access is required.';
  end if;

  select t.* into v_ticket
  from public.event_tickets t
  join public.event_bookings b on b.id = t.booking_id
  where pg_catalog.upper(t.ticket_code) = pg_catalog.upper(pg_catalog.btrim(p_ticket_code))
    and t.status = 'valid'
    and b.status = 'confirmed'
  for update;

  if not found then
    raise exception using message = 'Only a valid confirmed ticket can be checked in.';
  end if;

  if v_ticket.checked_in then
    raise exception using message = 'This ticket has already been checked in.';
  end if;

  update public.event_tickets
  set checked_in = true,
      checked_in_at = pg_catalog.now(),
      checked_in_by = (select auth.uid())
  where id = v_ticket.id;

  insert into public.admin_audit_logs (admin_id, action, affected_entity, entity_id)
  values ((select auth.uid()), 'check_in', 'event_ticket', v_ticket.id);

  return public.admin_verify_ticket(v_ticket.ticket_code);
end;
$$;

revoke all on function public.admin_check_in_ticket(text) from public;
grant execute on function public.admin_check_in_ticket(text) to authenticated;
