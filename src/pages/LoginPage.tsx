/**
 * The gate — a port of dristi-admin-app/lib/screens/login_screen.dart.
 *
 * Credentials are never pre-filled: the deployed admin site is public, and a
 * prefilled form hands working admin access to anyone who opens it.
 *
 * Visually this is the console's one moment of theatre — a drifting violet mesh
 * behind a single Double-Bezel card, with each band revealing on a stagger.
 * Everything past this screen is built for daily use instead.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck, type Icon } from '../components/icons';
import { useAuth } from '../context/AdminContext';
import { Eyebrow, PrimaryButton } from '../components/ui';

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  // A stale message from a previous visit should not greet the next sign-in.
  useEffect(() => clearError(), [clearError]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await login(email.trim(), password);
  };

  /** Staggered entry for each band of the composition. */
  const band = (delay: number) => ({
    className: `transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
      entered ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-10 opacity-0 blur-[4px]'
    }`,
    style: { transitionDelay: `${delay}ms` },
  });

  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-4 py-16">
      {/* A larger, slowly drifting mesh than the rest of the console uses. */}
      <div
        aria-hidden
        className="drift pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(45rem 35rem at 22% 18%, rgba(107,56,212,0.42), transparent 62%),' +
            'radial-gradient(38rem 30rem at 82% 78%, rgba(139,92,246,0.24), transparent 60%),' +
            'radial-gradient(30rem 26rem at 62% 8%, rgba(59,29,128,0.35), transparent 65%)',
        }}
      />
      <div className="grain-field" aria-hidden />

      <div className="relative z-10 w-full max-w-[26rem]">
        {/* Mark */}
        <div {...band(0)}>
          <div className="flex flex-col items-center text-center">
            <span className="rounded-[1.6rem] border border-hair-bright bg-white/[0.04] p-1.5 shadow-violet">
              <img src="/logo.jpg" alt="Dristi Fashions" className="size-16 rounded-[1.1rem] object-cover" />
            </span>
            <h1 className="mt-6 font-display text-[2.1rem] font-semibold leading-none tracking-[-0.03em] text-ink">
              Dristi Fashions
            </h1>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.34em] text-accent-soft/75">
              Admin Console
            </p>
          </div>
        </div>

        {/* The card */}
        <div {...band(120)}>
          <form onSubmit={submit} className="bezel mt-10 block">
            <div className="bezel-core p-7">
              <Eyebrow>Restricted</Eyebrow>
              <h2 className="mb-7 font-display text-[1.35rem] font-semibold tracking-[-0.02em] text-ink">
                Sign in to continue
              </h2>

              <Field
                id="admin-email"
                label="Email"
                icon={Mail}
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="username"
              />

              <div className="mt-5">
                <Field
                  id="admin-password"
                  label="Password"
                  icon={Lock}
                  type={visible ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  trailing={
                    <button
                      type="button"
                      onClick={() => setVisible(v => !v)}
                      aria-label={visible ? 'Hide password' : 'Show password'}
                      className="mr-2 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors duration-500 hover:text-ink"
                    >
                      {visible ? <Eye size={17} /> : <EyeOff size={17} />}
                    </button>
                  }
                />
              </div>

              {/* The error takes its space smoothly rather than snapping the card taller. */}
              <div
                className={`grid transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  error ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div
                    className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error/[0.09] px-4 py-3"
                    role="alert"
                  >
                    <span className="mt-px shrink-0 text-error">
                      <AlertCircle size={16} />
                    </span>
                    <p className="text-[12.5px] leading-relaxed text-error">{error}</p>
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <PrimaryButton label="Sign in" icon={LogIn} loading={isLoading} type="submit" />
              </div>
            </div>
          </form>
        </div>

        <div {...band(220)}>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="hairline-fade h-px w-12" />
            <span className="flex items-center gap-2 text-[9.5px] font-medium uppercase tracking-[0.24em] text-faint">
              <ShieldCheck size={13} />
              Secured access
            </span>
            <span className="hairline-fade h-px w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A login field — its own inner plate, which lights up as it takes focus. */
function Field({
  id,
  label,
  icon: Icon,
  type,
  value,
  onChange,
  autoComplete,
  trailing,
}: {
  id: string;
  label: string;
  icon: Icon;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  trailing?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </label>
      <div className="flex items-center rounded-2xl border border-hair bg-black/40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:border-accent/50 focus-within:bg-black/60 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.1)]">
        <span className="pl-4 text-muted">
          <Icon size={17} />
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className="w-full bg-transparent px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-faint"
        />
        {trailing}
      </div>
    </div>
  );
}
