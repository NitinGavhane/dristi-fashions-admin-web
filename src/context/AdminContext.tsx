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
import { AlertCircle, Trash2, X } from 'lucide-react';
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
  default: 'var(--color-coral)',
  error: 'var(--color-error)',
  success: 'var(--color-success)',
};

function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-5"
      role="status"
      aria-live="polite"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[10px] border bg-surface-alt px-4 py-3 shadow-lg-soft"
          style={{ borderColor: `color-mix(in srgb, ${TONE_ACCENT[t.tone]} 25%, transparent)` }}
        >
          <span
            className="mt-[3px] block size-2 shrink-0 rounded-full"
            style={{ backgroundColor: TONE_ACCENT[t.tone] }}
          />
          <p className="flex-1 text-[13px] font-semibold tracking-[0.3px] text-ink">{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 rounded p-1 text-muted transition hover:text-ink"
          >
            <X size={14} />
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
  const accent = isDelete ? 'var(--color-error)' : 'var(--color-coral)';
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
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onSettle(false);
      }}
    >
      <div className="w-full max-w-sm rounded-btn border border-hair-light bg-surface p-5 shadow-lg-soft">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-7 place-items-center rounded-md"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`, color: accent }}
          >
            {isDelete ? <Trash2 size={16} /> : <AlertCircle size={16} />}
          </span>
          <h2
            className="font-display text-sm font-extrabold tracking-[3px]"
            style={{ color: accent }}
          >
            {options.title ?? 'DELETE'}
          </h2>
        </div>
        <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{options.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onSettle(false)}
            className="label-caps rounded-input border border-hair-light bg-surface-alt px-[18px] py-2.5 text-[10px] tracking-[2px] text-ink-soft transition hover:bg-bg-alt"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onSettle(true)}
            className="label-caps rounded-input px-[18px] py-2.5 text-[10px] tracking-[2px] text-white transition hover:brightness-110"
            style={{ backgroundColor: accent }}
          >
            {options.confirmLabel ?? 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
