import { supabase } from '../config/supabase.js';

function getEmailRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (configuredUrl) return new URL('/auth', configuredUrl).toString();
  if (import.meta.env.PROD) return 'https://eventable-wine.vercel.app/auth';
  return new URL('/auth', window.location.origin).toString();
}

function readableAuthError(error) {
  if (error?.message?.toLowerCase().includes('invalid login credentials')) {
    return 'The email or password is incorrect.';
  }
  if (error?.message?.toLowerCase().includes('user already registered')) {
    return 'An account with this email already exists. Try logging in.';
  }
  return error?.message || 'Authentication failed. Please try again.';
}

export async function signUp({ fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: getEmailRedirectUrl(),
    },
  });
  if (error) throw new Error(readableAuthError(error));
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(readableAuthError(error));
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(readableAuthError(error));
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(readableAuthError(error));
  return data.session;
}

export function listenToAuthChanges(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
