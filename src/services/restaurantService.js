import { supabase } from '../config/supabase.js';

export async function getRestaurant() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, cuisine, description, location, opening_hours, image_path, reservation_fee_per_person')
    .eq('status', 'active')
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The restaurant is not available yet. Apply the restaurant migration first.');
  return data;
}

export async function getRestaurantAvailability({ restaurantId, date, guestCount }) {
  const { data, error } = await supabase.rpc('get_restaurant_availability', {
    p_restaurant_id: restaurantId,
    p_reservation_date: date,
    p_guest_count: guestCount,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function confirmRestaurantReservation({
  restaurantId,
  reservationDate,
  startTime,
  guestCount,
  phone,
  couponCode,
}) {
  const { data, error } = await supabase.rpc('confirm_restaurant_reservation', {
    p_restaurant_id: restaurantId,
    p_reservation_date: reservationDate,
    p_start_time: startTime,
    p_guest_count: guestCount,
    p_phone: phone,
    p_coupon_code: String(couponCode || '').trim().toUpperCase(),
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getMyRestaurantReservations() {
  const { data, error } = await supabase.rpc('get_my_restaurant_reservations');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function cancelRestaurantReservation(reservationId) {
  const { data, error } = await supabase.rpc('cancel_restaurant_reservation', {
    p_reservation_id: reservationId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminRestaurantReservations() {
  const { data, error } = await supabase.rpc('admin_restaurant_reservations');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAdminRestaurantMetrics() {
  const { data, error } = await supabase.rpc('admin_restaurant_metrics');
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelAdminRestaurantReservation(reservationId) {
  const { data, error } = await supabase.rpc('admin_cancel_restaurant_reservation', {
    p_reservation_id: reservationId,
  });
  if (error) throw new Error(error.message);
  return data;
}
