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
    p.email as attendee_email,
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
  join public.profiles p on p.id = b.user_id
  where t.public_token = pg_catalog.btrim(p_public_token);

  if not found then
    return pg_catalog.jsonb_build_object('status', 'unknown');
  end if;

  return pg_catalog.jsonb_build_object(
    'status',
      case
        when pg_catalog.btrim(v_ticket.booking_status) = 'deleted'
          or v_ticket.ticket_status = 'invalidated' then 'cancelled'
        when v_ticket.checked_in then 'checked-in'
        else 'valid'
      end,
    'event_name', v_ticket.event_name_snapshot,
    'attendee_name', v_ticket.attendee_name,
    'attendee_email', v_ticket.attendee_email,
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
