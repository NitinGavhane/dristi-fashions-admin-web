/**
 * Sign in — a port of dristi-admin-app/lib/screens/login_screen.dart.
 *
 * Credentials are never pre-filled: the deployed admin site is public, and a
 * prefilled form hands working admin access to anyone who opens it.
 *
 * A split layout rather than a centred phone card — the brand panel on the left
 * is the one place this console gets to be a brand rather than a tool, and it
 * collapses away entirely below `lg`.
 */
import { useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from '../components/icons';
import { useAuth } from '../context/AdminContext';
import { Button, Input } from '../components/primitives';

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
    <div className="flex min-h-[100dvh]">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] shrink-0 overflow-hidden border-r border-border bg-surface lg:block">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(40rem 32rem at 25% 20%, color-mix(in srgb, var(--color-primary) 28%, transparent), transparent 62%),' +
              'radial-gradient(32rem 26rem at 78% 82%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 60%)',
          }}
        />
  
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="" className="size-10 rounded-xl object-cover ring-1 ring-border" />
            <span className="font-display text-[15px] font-semibold tracking-[-0.005em] text-foreground">
              Dristi Fashions
            </span>
          </div>

          <div className="max-w-md">
            <h2 className="font-display text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground">
              Run the whole store
              <span className="block text-primary-soft">from one console.</span>
            </h2>
            <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground">
              Products, orders, dispatch, returns, referrals and payments — the same data the app sees, on a
              screen with room to work.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-subtle-foreground">
            <ShieldCheck size={14} />
            Authorised administrators only
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex min-w-0 flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-[22rem]">
          <div className="mb-8 lg:hidden">
            <img src="/logo.jpg" alt="" className="size-11 rounded-xl object-cover ring-1 ring-border" />
          </div>

          <h1 className="font-display text-[1.6rem] font-semibold tracking-[-0.025em] text-foreground">
            Sign in
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">
            Use your Dristi Fashions admin credentials.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Input
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              required
              placeholder="you@dristifashions.com"
            />

            <Input
              label="Password"
              type={visible ? 'text' : 'password'}
              icon={Lock}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              suffix={
                <button
                  type="button"
                  onClick={() => setVisible(v => !v)}
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  className="grid size-7 place-items-center rounded-md text-subtle-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              }
            />

            {/* The error takes its space smoothly rather than snapping the form taller. */}
            <div
              className={`grid transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                error ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5"
                >
                  <span className="mt-px shrink-0 text-destructive">
                    <AlertCircle size={15} />
                  </span>
                  <p className="text-[12.5px] leading-relaxed text-destructive">{error}</p>
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" full loading={isLoading} icon={LogIn}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
