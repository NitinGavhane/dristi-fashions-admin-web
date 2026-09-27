/**
 * Session, toasts and confirm dialogs for the whole panel.
 *
 * Auth is a port of dristi-admin-app/lib/providers/auth_provider.dart: the same
 * three-state (loading / authenticated / error) shape and the same error
 * messages. Toasts stand in for Flutter's ScaffoldMessenger snackbars and the
 * confirm dialog for `confirmDeleteDialog` in widgets.dart, so pages read the
 * same way as their Dart counterparts.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Close, Trash } from '../components/icons';
import * as api from '../lib/api';
import { ApiError, clearTokens, hasToken, initApiClient, setSessionExpiredHandler } from '../lib/apiClient';

/* ── Auth ────────────────────────────────────────────────────────────────── */

interface AuthState {
  /** True once the stored session has been checked (the splash gate). */
  ready: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

/** AdminAuthProvider._extractError, kept message-for-message. */
function loginErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    // apiClient falls back to "Request failed (NNN)" when the body carried no
    // `detail`; a real detail from the API is always the better message.
    const isGeneric = e.message.startsWith('Request failed (');
    if (!isGeneric && e.statusCode !== 0) return e.message;
    if (e.statusCode === 401) return 'Invalid admin credentials';
    if (e.statusCode === 403) return 'Access denied. Admin only.';
    // statusCode 0 is the client's own "cannot reach the server" message.
    if (e.statusCode === 0) return e.message;
  }
  return 'Login failed. Please try again.';
}

/* ── Toasts ──────────────────────────────────────────────────────────────── */

interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'error' | 'success';
}

type ToastFn = (message: string, opts?: { error?: boolean; success?: boolean }) => void;

/* ── Confirm dialog ──────────────────────────────────────────────────────── */

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  /** `delete` paints the confirm button red, as confirmDeleteDialog does. */
  tone?: 'delete' | 'primary';
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

interface AdminContextValue {
  auth: AuthState;
  toast: ToastFn;
  confirm: ConfirmFn;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  // Restore the stored session, then let the app render. The 400ms the Flutter
  // splash waits exists to let its logo animation play; nothing here needs it.
  useEffect(() => {
    initApiClient();
    setIsAuthenticated(hasToken());
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setIsAuthenticated(false);
  }, []);

  // A refresh that fails for good drops the panel back to the login screen,
  // the same as ApiService.onUnauthorized -> AdminAuthProvider.logout().
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setIsAuthenticated(false);
      setError('Your session expired. Please sign in again.');
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.login(email, password);
      setIsAuthenticated(true);
      return true;
    } catch (e) {
      setError(loginErrorMessage(e));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const toast = useCallback<ToastFn>((message, opts) => {
    const id = ++toastId.current;
    const tone: Toast['tone'] = opts?.error ? 'error' : opts?.success ? 'success' : 'default';
    setToasts(list => [...list, { id, message, tone }]);
    window.setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  const confirm = useCallback<ConfirmFn>(
    opts => new Promise<boolean>(resolve => setPending({ ...opts, resolve })),
    [],
  );

  const settle = useCallback(
    (ok: boolean) => {
      setPending(current => {
        current?.resolve(ok);
        return null;
      });
    },
    [],
  );

  const value = useMemo<AdminContextValue>(
    () => ({
      auth: { ready, isAuthenticated, isLoading, error, login, logout, clearError },
      toast,
      confirm,
    }),
    [ready, isAuthenticated, isLoading, error, login, logout, clearError, toast, confirm],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
      {pending && <ConfirmHost options={pending} onSettle={settle} />}
    </AdminContext.Provider>
  );
}

function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}

export const useAuth = (): AuthState => useAdmin().auth;
export const useToast = (): ToastFn => useAdmin().toast;
export const useConfirm = (): ConfirmFn => useAdmin().confirm;

/* ── Hosts ───────────────────────────────────────────────────────────────── */

const TONE_ACCENT: Record<Toast['tone'], string> = {
  default: 'var(--color-accent)',
  error: 'var(--color-error)',
  success: 'var(--color-success)',
};

function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2.5 px-4 pb-7"
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="glass pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)]"
          style={{ borderColor: `color-mix(in srgb, ${TONE_ACCENT[t.tone]} 35%, transparent)` }}
        >
          <span
            className="mt-[5px] block size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: TONE_ACCENT[t.tone], boxShadow: `0 0 10px ${TONE_ACCENT[t.tone]}` }}
          />
          <p className="flex-1 text-[13px] font-medium leading-relaxed text-ink">{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
            className="-mr-1 -mt-0.5 rounded-full p-1 text-muted transition-colors duration-500 hover:text-ink"
          >
            <Close size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ConfirmHost({
  options,
  onSettle,
}: {
  options: ConfirmOptions;
  onSettle: (ok: boolean) => void;
}) {
  const isDelete = (options.tone ?? 'delete') === 'delete';
  const accent = isDelete ? 'var(--color-error)' : 'var(--color-accent)';
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSettle(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSettle]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onSettle(false);
      }}
    >
      <div className="bezel w-full max-w-sm">
        <div className="bezel-core p-6">
        <div className="flex items-center gap-3">
          <span
            className="grid size-9 place-items-center rounded-full border"
            style={{
              backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
              color: accent,
            }}
          >
            {isDelete ? <Trash size={17} /> : <AlertCircle size={16} />}
          </span>
          <h2 className="font-display text-[1.1rem] font-semibold tracking-[-0.02em] text-ink">
            {options.title ?? 'Delete'}
          </h2>
        </div>
        <p className="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-soft">{options.message}</p>
        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onSettle(false)}
            className="rounded-full border border-hair-bright bg-white/[0.03] px-5 py-2.5 text-[13px] font-medium text-ink-soft transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-hair-strong hover:bg-white/[0.07] hover:text-ink active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onSettle(true)}
            className="rounded-full px-5 py-2.5 text-[13px] font-medium text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-110 active:scale-[0.97]"
            style={{
              background: `linear-gradient(150deg, color-mix(in srgb, ${accent} 82%, white), ${accent} 55%, color-mix(in srgb, ${accent} 78%, black))`,
              boxShadow: `inset 0 1px 1px rgba(255,255,255,0.28), 0 14px 30px -14px ${accent}`,
            }}
          >
            {options.confirmLabel ?? 'Delete'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
