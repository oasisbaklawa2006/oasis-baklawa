import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface CustomerSession {
  session: Session | null;
  user: User | null;
}

export async function getCustomerSession(): Promise<CustomerSession> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Unable to read customer session: ${error.message}`);
  }

  return {
    session: data.session,
    user: data.session?.user ?? null,
  };
}

export async function signInWithEmail(email: string, password: string): Promise<CustomerSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  return {
    session: data.session,
    user: data.user,
  };
}

export async function signOutCustomer(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`Unable to sign out: ${error.message}`);
  }
}
