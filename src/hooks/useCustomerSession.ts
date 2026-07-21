import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface CustomerSessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export function useCustomerSession(): CustomerSessionState {
  const [state, setState] = useState<CustomerSessionState>({
    session: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setState({ session: null, user: null, loading: false });
        return;
      }

      setState({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}
