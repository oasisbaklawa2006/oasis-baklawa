import { FormEvent, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { signInWithEmail, signOutCustomer } from '../services/auth';

interface BuyerAccessProps {
  user: User | null;
}

export function BuyerAccess({ user }: BuyerAccessProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      await signInWithEmail(email.trim(), password);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setMessage(null);

    try {
      await signOutCustomer();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to sign out');
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <section className="access-panel" aria-label="Buyer account">
        <div>
          <span className="eyebrow">Buyer account</span>
          <strong>{user.email}</strong>
        </div>
        <button type="button" onClick={handleSignOut} disabled={busy}>
          Sign out
        </button>
        {message ? <p role="alert">{message}</p> : null}
      </section>
    );
  }

  return (
    <form className="access-panel" onSubmit={handleSubmit}>
      <div>
        <span className="eyebrow">Approved buyers</span>
        <strong>Sign in for trade pricing and order tracking</strong>
      </div>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {message ? <p role="alert">{message}</p> : null}
    </form>
  );
}
