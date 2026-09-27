/**
 * Theme switching — dark (default), light, or follow the OS.
 *
 * The class is applied to <html> rather than a wrapper so portalled elements
 * (menus, dialogs, the command palette) inherit it too. The initial value is
 * also written by an inline script in index.html, before first paint, which is
 * what stops a light-mode admin getting a black flash on every page load.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeChoice = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'dristi_admin_theme';

interface ThemeState {
  /** What the admin picked. */
  choice: ThemeChoice;
  /** What is actually on screen once `system` has been resolved. */
  resolved: 'dark' | 'light';
  setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  } catch {
    /* private browsing — fall through to the default */
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStoredChoice);
  const [systemDark, setSystemDark] = useState(() =>
    typeof window === 'undefined' ? true : systemPrefersDark(),
  );

  // Follow the OS while the choice is `system`.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: 'dark' | 'light' = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

  useEffect(() => {
    const root = document.documentElement;
    // Suppress transitions for one frame, or every themed element on the page
    // animates its colour at once and the flip looks like a smear.
    root.classList.add('theme-switching');
    root.classList.toggle('dark', resolved === 'dark');
    const raf = requestAnimationFrame(() => root.classList.remove('theme-switching'));
    return () => cancelAnimationFrame(raf);
  }, [resolved]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo<ThemeState>(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
