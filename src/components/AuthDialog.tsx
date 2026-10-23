import React, { useState } from 'react';
import { X, Mail, LockKeyhole, UserRound, LoaderCircle, Chrome, ArrowLeft } from 'lucide-react';
import {
  auth,
  createEmailAccount,
  requestPasswordReset,
  resendVerificationEmail,
  signInWithEmail,
  signInWithGoogle,
} from '../lib/firebase';

type AuthMode = 'signin' | 'signup' | 'reset';

interface AuthDialogProps {
  onClose: () => void;
  onAuthenticated: () => void;
}

function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address does not look valid. Check it and try again.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Email or password is incorrect. If you are new here, create an account first.';
    case 'auth/email-already-in-use':
      return 'An account already uses this email. Try signing in instead.';
    case 'auth/weak-password':
      return 'Choose a stronger password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a little and try again.';
    case 'auth/network-request-failed':
      return 'Could not reach the sign-in service. Check your internet connection and retry.';
    case 'auth/popup-blocked':
      return 'Google sign-in was blocked by the browser. Allow pop-ups or use email and password.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before it finished. You can try again.';
    case 'auth/unauthorized-domain':
      return 'This app domain is not enabled for Firebase Authentication. Add the current domain in Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled in Firebase. Enable it under Authentication → Sign-in method.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'Google sign-in is not supported in this app environment yet. Use email and password for now; native Android Google OAuth needs native Firebase configuration.';
    case 'auth/invalid-api-key':
      return 'Firebase configuration is invalid. The app administrator needs to check the Firebase web API key.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Sign-in failed unexpectedly. Please try again.';
  }
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ onClose, onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address to continue.');
      return;
    }
    if (mode !== 'reset' && !password) {
      setError('Enter your password to continue.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Choose a password with at least 6 characters.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('The passwords do not match. Check them and try again.');
      return;
    }

    await runAction(async () => {
      if (mode === 'reset') {
        await requestPasswordReset(email);
        setNotice('If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.');
        return;
      }

      const user = mode === 'signup'
        ? await createEmailAccount(name, email, password)
        : await signInWithEmail(email, password);

      if (!user.emailVerified) {
        if (mode === 'signup') {
          setNotice('Your account has been created. We sent a verification link—open it, then return here. Check your spam folder if it is missing.');
        } else {
          try {
            await resendVerificationEmail();
            setNotice('Email verification is still pending. We sent a fresh verification link—open it, then return here.');
          } catch {
            setNotice('Email verification is still pending. Use the resend button below or check your inbox.');
          }
        }
        return;
      }

      setNotice('Signed in successfully.');
      onAuthenticated();
      onClose();
    });
  };

  const handleGoogle = () => runAction(async () => {
    const user = await signInWithGoogle();
    if (user) {
      onAuthenticated();
      onClose();
    }
  });

  const title = mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back';
  const subtitle = mode === 'signup'
    ? 'Save your poetry and access your conversations across sessions.'
    : mode === 'reset'
      ? 'We’ll email you a secure password-reset link.'
      : 'Sign in to keep your Sukhan AI conversations synced.';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-gold)]">Sukhan AI · Account</div>
            <h2 id="auth-dialog-title" className="font-display text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close sign-in" className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode !== 'reset' && (
          <>
            <button type="button" onClick={handleGoogle} disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-gold)] disabled:cursor-wait disabled:opacity-60">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
              Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              <span className="h-px flex-1 bg-[var(--border-subtle)]" /> or use email <span className="h-px flex-1 bg-[var(--border-subtle)]" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Your name <span className="text-[var(--text-muted)]">(optional)</span></span>
              <span className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 focus-within:border-[var(--accent-gold)]">
                <UserRound className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we address you?" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              </span>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Email address</span>
            <span className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 focus-within:border-[var(--accent-gold)]">
              <Mail className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
            </span>
          </label>
          {mode !== 'reset' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Password</span>
              <span className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 focus-within:border-[var(--accent-gold)]">
                <LockKeyhole className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 6 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              </span>
            </label>
          )}
          {mode === 'signup' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Confirm password</span>
              <span className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 focus-within:border-[var(--accent-gold)]">
                <LockKeyhole className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <input type="password" autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter password again" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              </span>
            </label>
          )}

          {mode === 'signin' && (
            <div className="flex justify-end">
              <button type="button" onClick={() => { setMode('reset'); setError(''); setNotice(''); }} className="text-xs font-medium text-[var(--accent-gold)] hover:underline">Forgot password?</button>
            </div>
          )}

          {error && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs leading-5 text-rose-300">{error}</div>}
          {notice && <div role="status" className="rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-3 py-2.5 text-xs leading-5 text-[var(--text-primary)]">{notice}</div>}

          {notice && !error && mode !== 'reset' && auth.currentUser && !auth.currentUser.emailVerified && (
            <button type="button" disabled={busy} onClick={() => runAction(async () => { await resendVerificationEmail(); setNotice('A fresh verification link has been sent. Check your inbox and spam folder.'); })} className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent-gold)] disabled:opacity-50">Resend verification email</button>
          )}

          <button type="submit" disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-gold)] px-4 py-3 text-sm font-bold text-[var(--accent-fg)] transition hover:bg-[var(--accent-gold-hover)] disabled:cursor-wait disabled:opacity-60">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-center text-xs text-[var(--text-secondary)]">
          {mode === 'reset' ? (
            <button type="button" onClick={() => { setMode('signin'); setError(''); setNotice(''); }} className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent-gold)] hover:underline"><ArrowLeft className="h-3 w-3" /> Back to sign in</button>
          ) : mode === 'signup' ? (
            <>Already have an account? <button type="button" onClick={() => { setMode('signin'); setError(''); setNotice(''); }} className="font-semibold text-[var(--accent-gold)] hover:underline">Sign in</button></>
          ) : (
            <>New to Sukhan AI? <button type="button" onClick={() => { setMode('signup'); setError(''); setNotice(''); }} className="font-semibold text-[var(--accent-gold)] hover:underline">Create an account</button></>
          )}
        </div>
        <p className="mt-4 text-center text-[10px] leading-4 text-[var(--text-muted)]">Your account is secured by Firebase Authentication. Never share your password with anyone.</p>
      </section>
    </div>
  );
};
