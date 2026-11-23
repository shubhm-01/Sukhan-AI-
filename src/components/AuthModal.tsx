import React, { useState } from 'react';
import { LockKeyhole, Mail, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needsOtp, setNeedsOtp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const submitCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!supabase || !isSupabaseConfigured) {
      setError('Cloud Sign In is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the APK build settings.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || password.length < 8) {
      setError('Enter a valid email and a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          onClose();
          return;
        }
        setNeedsOtp(true);
        setNotice('A 6-digit verification code has been sent to your email. Enter it below to finish creating your account.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInError) {
          if (/email not confirmed|not confirmed/i.test(signInError.message)) {
            const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
            if (resendError) throw resendError;
            setNeedsOtp(true);
            setNotice('Your email is not verified yet. We sent a new 6-digit verification code.');
            return;
          }
          throw signInError;
        }
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not authenticate. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyEmailOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!supabase) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'signup',
      });
      if (verifyError) throw verifyError;
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The verification code was not accepted.');
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    setError('');
    setNotice('');
    if (!supabase) return;
    setBusy(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (resendError) throw resendError;
      setNotice('A new verification code has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cloud-auth-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 shadow-2xl sm:p-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">Sukhan AI · Cloud</p>
            <h2 id="cloud-auth-title" className="mt-1 font-display text-2xl font-semibold text-[var(--text-primary)]">{needsOtp ? 'Verify your email' : 'Cloud Sign In'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close sign in" className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"><X className="h-4 w-4" /></button>
        </header>

        {!isSupabaseConfigured ? (
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <p>Cloud accounts are not configured in this build yet. Your chats and saved Shayari continue working locally on this device.</p>
            <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs leading-5">Build the APK with <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong>. Never use a service-role key in the Android app.</p>
          </div>
        ) : needsOtp ? (
          <form onSubmit={verifyEmailOtp} className="space-y-4">
            <p className="text-xs leading-5 text-[var(--text-secondary)]">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
            <label className="block space-y-1.5 text-xs text-[var(--text-muted)]"><span>6-digit email code</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-3 text-center text-xl tracking-[0.5em] text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)]" /></label>
            <button type="submit" disabled={busy || otp.length !== 6} className="w-full rounded-xl bg-[var(--accent-gold)] px-4 py-3 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50">{busy ? 'Verifying…' : 'Verify email'}</button>
            <button type="button" onClick={() => void resendOtp()} disabled={busy} className="w-full py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-gold)]">Resend code</button>
          </form>
        ) : (
          <form onSubmit={submitCredentials} className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--bg-canvas)] p-1">
              <button type="button" onClick={() => { setMode('signin'); setError(''); }} className={`rounded-lg px-3 py-2 text-xs font-medium ${mode === 'signin' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Sign in</button>
              <button type="button" onClick={() => { setMode('signup'); setError(''); }} className={`rounded-lg px-3 py-2 text-xs font-medium ${mode === 'signup' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Create account</button>
            </div>
            <label className="block space-y-1.5 text-xs text-[var(--text-muted)]"><span>Email address</span><span className="relative block"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] py-3 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)]" /></span></label>
            <label className="block space-y-1.5 text-xs text-[var(--text-muted)]"><span>Password</span><span className="relative block"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" /><input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] py-3 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold)]" /></span></label>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[var(--accent-gold)] px-4 py-3 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account and verify email' : 'Sign in securely'}</button>
          </form>
        )}

        {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-300">{notice}</p>}
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-5 text-rose-300">{error}</p>}
        <p className="mt-4 text-center text-[10px] leading-4 text-[var(--text-muted)]">No browser popups. Sign in stays inside the Android app.</p>
      </section>
    </div>
  );
};
