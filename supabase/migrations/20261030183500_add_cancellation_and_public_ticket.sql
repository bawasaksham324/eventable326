create or replace function public.admin_cancel_event_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.event_bookings%rowtype;
  v_ticket_count integer;
  v_seat_count integer;
begin
  if not public.is_eventable_admin() then
    raise exception using message = 'Administrator access is required.';
  end if;

  select *
    into v_booking
  from public.event_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception using message = 'Booking was not found.';
  end if;

  if v_booking.status = 'deleted' then
    return pg_catalog.jsonb_build_object(
      'booking_id', v_booking.id,
      'status', 'deleted',
      'message', 'Booking is already cancelled.'
    );
  end if;

  with locked_tickets as (
    select id, seat_id
    from public.event_tickets
    where booking_id = v_booking.id
    for update
  ),
  invalidated as (
    update public.event_tickets t
    set status = 'invalidated'
    from locked_tickets l
    where t.id = l.id
    returning t.seat_id
  )
  select count(*), count(distinct seat_id)
    into v_ticket_count, v_seat_count
  from invalidated;

  update public.event_seats s
  set status = 'available'
  where s.id in (
    select t.seat_id
    from public.event_tickets t
    where t.booking_id = v_booking.id
  );

  update public.event_bookings
  set status = 'deleted',
      deleted_at = pg_catalog.now(),
      deleted_by = (select auth.uid())
  where id = v_booking.id;

  insert into public.admin_audit_logs (admin_id, action, affected_entity, entity_id)
  values ((select auth.uid()), 'cancel_booking', 'event_booking', v_booking.id);

  return pg_catalog.jsonb_build_object(
    'booking_id', v_booking.id,
    'status', 'deleted',
    'invalidated_tickets', v_ticket_count,
    'released_seats', v_seat_count
  );
end;
$$;

revoke all on function public.admin_cancel_event_booking(uuid) from public;
grant execute on function public.admin_cancel_event_booking(uuid) to authenticated;

create or replace function public.get_public_ticket(p_public_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket record;
begin
  select
    t.event_name_snapshot,
    t.attendee_name,
    t.seat_number_snapshot,
    t.zone_name_snapshot,
    t.status as ticket_status,
    t.checked_in,
    t.start_at_snapshot,
    t.end_at_snapshot,
    t.venue_snapshot,
    b.status as booking_status
  into v_ticket
  from public.event_tickets t
  join public.event_bookings b on b.id = t.booking_id
  where t.public_token = pg_catalog.btrim(p_public_token);

  if not found then
    return pg_catalog.jsonb_build_object('status', 'unknown');
  end if;

  return pg_catalog.jsonb_build_object(
    'status',
      case
        when pg_catalog.btrim(v_ticket.booking_status) = 'deleted' or v_ticket.ticket_status = 'invalidated' then 'cancelled'
        when v_ticket.checked_in then 'checked-in'
        else 'valid'
      end,
    'event_name', v_ticket.event_name_snapshot,
    'attendee_name', v_ticket.attendee_name,
    'seat_number', v_ticket.seat_number_snapshot,
    'zone_name', v_ticket.zone_name_snapshot,
    'start_at', v_ticket.start_at_snapshot,
    'end_at', v_ticket.end_at_snapshot,
    'venue', v_ticket.venue_snapshot
  );
end;
$$;

revoke all on function public.get_public_ticket(text) from public;
grant execute on function public.get_public_ticket(text) to anon, authenticated;
