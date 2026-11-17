import { supabase } from '../config/supabase.js';

export async function getCurrentProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminDashboardData() {
  const { data, error } = await supabase.rpc('admin_dashboard_data');
  if (error) throw new Error(error.message);
  return data;
}

export async function verifyAdminTicket(ticketCode) {
  const { data, error } = await supabase.rpc('admin_verify_ticket', {
    p_ticket_code: ticketCode.trim(),
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function checkInAdminTicket(ticketCode) {
  const { data, error } = await supabase.rpc('admin_check_in_ticket', {
    p_ticket_code: ticketCode.trim(),
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelAdminBooking(bookingId) {
  const { data, error } = await supabase.rpc('admin_cancel_event_booking', {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getPublicTicket(publicToken) {
  const { data, error } = await supabase.rpc('get_public_ticket', {
    p_public_token: publicToken,
  });
  if (error) throw new Error(error.message);
  return data;
}
