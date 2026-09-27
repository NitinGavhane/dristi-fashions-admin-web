/**
 * Admin sign-in — a port of dristi-admin-app/lib/screens/login_screen.dart.
 *
 * Credentials are never pre-filled: the deployed admin site is public, and a
 * prefilled form hands working admin access to anyone who opens it.
 */
import { useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AdminContext';
import { PrimaryButton } from '../components/ui';

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);

  // A stale message from a previous visit should not greet the next sign-in.
  useEffect(() => clearError(), [clearError]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await login(email.trim(), password);
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_60%_15%,#ffffff,var(--color-bg)_55%)] px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo.jpg"
            alt="Dristi Fashions"
            className="size-24 rounded-[20px] border-[1.5px] border-coral/40 object-cover shadow-violet"
          />
          <h1 className="mt-6 font-display text-2xl font-black tracking-[4px] text-coral sm:text-[26px]">
            DRISTI FASHIONS
          </h1>
          <p className="label-caps mt-2 text-[11px] tracking-[8px] text-gold">ADMIN PANEL</p>
        </div>

        <form
          onSubmit={submit}
          className="card-surface mt-12 rounded-card-lg border border-coral/20 p-7 shadow-lg-soft"
        >
          <label className="label-caps block text-[10px] tracking-[2.5px] text-muted" htmlFor="admin-email">
            Email
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-2.5 top-2.5 grid size-8 place-items-center rounded-md bg-coral/10 text-coral">
              <Mail size={18} />
            </span>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-lg border border-hair bg-bg-alt py-3.5 pl-[52px] pr-4 text-[13px] text-ink focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
            />
          </div>

          <label className="label-caps mt-5 block text-[10px] tracking-[2.5px] text-muted" htmlFor="admin-password">
            Password
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-2.5 top-2.5 grid size-8 place-items-center rounded-md bg-coral/10 text-coral">
              <Lock size={18} />
            </span>
            <input
              id="admin-password"
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-hair bg-bg-alt py-3.5 pl-[52px] pr-12 text-[13px] text-ink focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
            />
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              aria-label={visible ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition hover:text-ink"
            >
              {visible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {error && (
            <div
              className="mt-3 flex items-center gap-2.5 rounded-md border border-error/20 bg-error/[0.08] px-3 py-2.5"
              role="alert"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-error/15 text-error">
                <AlertCircle size={14} />
              </span>
              <p className="text-[11px] text-error">{error}</p>
            </div>
          )}

          <div className="mt-6">
            <PrimaryButton label="Sign In" icon={LogIn} loading={isLoading} type="submit" />
          </div>
        </form>

        <div className="mt-7 flex items-center justify-center gap-3">
          <span className="hairline-violet block h-px w-7" />
          <span className="text-coral/80">
            <ShieldCheck size={13} />
          </span>
          <span className="label-caps text-[8.5px] tracking-[3px] text-muted">SECURED ADMIN ACCESS</span>
          <span className="block size-1 rounded-full bg-coral/60" />
          <span className="hairline-violet block h-px w-7" />
        </div>
      </div>
    </div>
  );
}
