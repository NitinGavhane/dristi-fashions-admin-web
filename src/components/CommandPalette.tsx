/**
 * ⌘K — jump anywhere, run anything.
 *
 * The thing a keyboard-driven admin reaches for and a phone app can never have.
 * It indexes every destination and the create actions, matches on a loose
 * subsequence (so "npr" finds "New product"), and is fully arrow-key driven.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Moon,
  Plus,
  Search,
  Sun,
  type Icon,
} from './icons';
import { Kbd, cx } from './primitives';
import { NAV_ENTRIES } from './navigation';
import { useTheme } from '../context/ThemeContext';

interface Command {
  id: string;
  label: string;
  group: string;
  icon: Icon;
  run: () => void;
  keywords?: string;
}

/**
 * Loose subsequence match — every character of the query must appear in order,
 * so "npr" hits "New product". Returns a score; lower is a tighter match.
 */
function score(haystack: string, needle: string): number | null {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();

  const direct = h.indexOf(n);
  if (direct !== -1) return direct; // a contiguous hit always wins

  let at = 0;
  let spread = 0;
  for (const char of n) {
    const found = h.indexOf(char, at);
    if (found === -1) return null;
    spread += found - at;
    at = found + 1;
  }
  return 100 + spread;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { resolved, setChoice } = useTheme();

  const go = useCallback(
    (route: string) => {
      onClose();
      onNavigate(route);
    },
    [onClose, onNavigate],
  );

  const commands = useMemo<Command[]>(() => {
    const navigation: Command[] = NAV_ENTRIES.map(entry => ({
      id: `go:${entry.route}`,
      label: entry.label,
      group: 'Go to',
      icon: entry.icon,
      run: () => go(entry.route),
      keywords: entry.group,
    }));

    const create: Command[] = [
      { route: '/products/new', label: 'New product' },
      { route: '/categories/new', label: 'New category' },
      { route: '/banners/new', label: 'New banner' },
      { route: '/coupons/new', label: 'New coupon' },
      { route: '/payment-methods/new', label: 'New payment method' },
    ].map(item => ({
      id: `new:${item.route}`,
      label: item.label,
      group: 'Create',
      icon: Plus,
      run: () => go(item.route),
      keywords: 'add create',
    }));

    const preferences: Command[] = [
      {
        id: 'theme:toggle',
        label: resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        group: 'Preferences',
        icon: resolved === 'dark' ? Sun : Moon,
        run: () => {
          setChoice(resolved === 'dark' ? 'light' : 'dark');
          onClose();
        },
        keywords: 'theme dark light appearance',
      },
    ];

    return [...navigation, ...create, ...preferences];
  }, [go, onClose, resolved, setChoice]);

  const results = useMemo(() => {
    const matched = commands
      .map(command => {
        const s = score(`${command.label} ${command.keywords ?? ''}`, query.trim());
        return s === null ? null : { command, s };
      })
      .filter((x): x is { command: Command; s: number } => x !== null)
      .sort((a, b) => a.s - b.s)
      .map(x => x.command);

    // Group while preserving the ranked order within each group.
    const groups = new Map<string, Command[]>();
    for (const command of matched) {
      const list = groups.get(command.group) ?? [];
      list.push(command);
      groups.set(command.group, list);
    }
    return { flat: matched, groups: [...groups.entries()] };
  }, [commands, query]);

  // Reset whenever it opens, so it never reopens mid-search.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => (i + 1) % Math.max(1, results.flat.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => (i - 1 + results.flat.length) % Math.max(1, results.flat.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results.flat[active]?.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let index = -1;

  return (
    <div
      className="animate-overlay fixed inset-0 z-[120] flex items-start justify-center bg-black/55 p-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="floating animate-pop w-full max-w-lg overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <span className="text-subtle-foreground">
            <Search size={17} />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions…"
            aria-label="Search pages and actions"
            className="w-full bg-transparent py-4 text-[14.5px] text-foreground outline-none placeholder:text-subtle-foreground"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div ref={listRef} className="max-h-[22rem] overflow-y-auto p-2">
          {results.flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
              Nothing matches “{query}”.
            </p>
          ) : (
            results.groups.map(([group, items]) => (
              <div key={group} className="mb-1 last:mb-0">
                <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                  {group}
                </div>
                {items.map(command => {
                  index += 1;
                  const isActive = index === active;
                  const myIndex = index;
                  return (
                    <button
                      key={command.id}
                      type="button"
                      data-active={isActive}
                      onMouseEnter={() => setActive(myIndex)}
                      onClick={command.run}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100',
                        isActive ? 'bg-primary/15 text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <command.icon size={16} />
                      <span className="flex-1 truncate text-[13.5px] font-medium">{command.label}</span>
                      {isActive && (
                        <span className="text-subtle-foreground">
                          <ArrowRight size={14} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11.5px] text-subtle-foreground">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> open
          </span>
        </div>
      </div>
    </div>
  );
}

/** Registers the ⌘K / Ctrl-K shortcut. Returns the open state and its setter. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { open, setOpen };
}
