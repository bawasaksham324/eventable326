import { supabase } from '../config/supabase.js';

const GALA_NAME = "New Year's Eve Gala";

export async function getGalaData() {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, name, start_at, end_at, venue, city')
    .eq('name', GALA_NAME)
    .eq('status', 'active')
    .limit(1);
  if (eventError) throw new Error(eventError.message);
  const event = events?.[0];
  if (!event) throw new Error('The Gala is not available yet. Apply the Phase 3 migration first.');

  const [{ data: zones, error: zoneError }, { data: seats, error: seatError }] = await Promise.all([
    supabase.from('event_zones').select('id, name, current_price, capacity').eq('event_id', event.id).order('name'),
    supabase.from('event_seats').select('id, zone_id, seat_number, status').eq('event_id', event.id).order('seat_number'),
  ]);
  if (zoneError) throw new Error(zoneError.message);
  if (seatError) throw new Error(seatError.message);
  return { event, zones, seats };
}

export async function confirmEventBooking({ eventId, attendees, couponCode }) {
  const normalizedCouponCode = String(couponCode || '').trim().toUpperCase();
  const { data, error } = await supabase.rpc('confirm_event_booking', {
    p_event_id: eventId,
    p_attendees: attendees,
    p_coupon_code: normalizedCouponCode,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getMyEventBookings() {
  const { data, error } = await supabase
    .from('event_bookings')
    .select('id, subtotal, discount_amount, total_amount, status, created_at, event_tickets(id, attendee_name, ticket_code, public_token, event_name_snapshot, zone_name_snapshot, seat_number_snapshot, ticket_price_snapshot, venue_snapshot, start_at_snapshot, end_at_snapshot, status, checked_in)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
