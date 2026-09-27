/**
 * The console shell.
 *
 * Desktop keeps a permanent rail — an admin needs its sections always reachable,
 * and a floating island that hides thirteen destinations behind a tap would be
 * style at the expense of the people using this all day. The rail itself is a
 * detached glass column, not a panel glued to the viewport edge.
 *
 * Compact viewports get the full treatment: a hamburger that morphs into an X,
 * and a screen-filling glass overlay whose links reveal on a stagger.
 */
import React, { useEffect, useState } from 'react';
import {
  LogOut,
  NavBanners,
  NavCategories,
  NavCoupons,
  NavDashboard,
  NavDelivery,
  NavDeliverySettings,
  NavMessages,
  NavOrders,
  NavPayments,
  NavProducts,
  NavReferrals,
  NavReturns,
  NavUsers,
  type Icon,
} from './icons';
import { MenuGlyph } from './ui';
import { useAuth, useConfirm } from '../context/AdminContext';

export interface NavEntry {
  icon: Icon;
  label: string;
  route: string;
  /** Groups the rail, so thirteen items do not read as one undifferentiated list. */
  group: 'Overview' | 'Catalogue' | 'Fulfilment' | 'Growth';
}

export const NAV_ENTRIES: NavEntry[] = [
  { icon: NavDashboard, label: 'Dashboard', route: '/dashboard', group: 'Overview' },
  { icon: NavUsers, label: 'Users', route: '/users', group: 'Overview' },
  { icon: NavOrders, label: 'Orders', route: '/orders', group: 'Overview' },

  { icon: NavProducts, label: 'Products', route: '/products', group: 'Catalogue' },
  { icon: NavCategories, label: 'Categories', route: '/categories', group: 'Catalogue' },
  { icon: NavBanners, label: 'Banners', route: '/banners', group: 'Catalogue' },

  { icon: NavDelivery, label: 'Delivery', route: '/delivery', group: 'Fulfilment' },
  { icon: NavReturns, label: 'Returns', route: '/returns', group: 'Fulfilment' },
  { icon: NavDeliverySettings, label: 'Delivery Settings', route: '/delivery-settings', group: 'Fulfilment' },
  { icon: NavPayments, label: 'Payment Methods', route: '/payment-methods', group: 'Fulfilment' },

  { icon: NavCoupons, label: 'Coupons', route: '/coupons', group: 'Growth' },
  { icon: NavReferrals, label: 'Referrals', route: '/referrals', group: 'Growth' },
  { icon: NavMessages, label: 'Messages', route: '/messages', group: 'Growth' },
];

const GROUPS = ['Overview', 'Catalogue', 'Fulfilment', 'Growth'] as const;

export function AdminShell({
  currentRoute,
  drawerOpen,
  onCloseDrawer,
  onNavigate,
  children,
}: {
  currentRoute: string;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh]">
      {/* Fixed, pointer-events-none, so neither ever repaints on scroll. */}
      <div className="mesh-field" aria-hidden />
      <div className="grain-field" aria-hidden />

      <div className="relative z-10 lg:flex lg:gap-0">
        <aside className="hidden shrink-0 p-6 pr-0 lg:block lg:w-[19rem]">
          <div className="sticky top-6 h-[calc(100dvh-3rem)]">
            <NavRail currentRoute={currentRoute} onNavigate={onNavigate} />
          </div>
        </aside>

        <MobileOverlay
          open={drawerOpen}
          currentRoute={currentRoute}
          onClose={onCloseDrawer}
          onNavigate={route => {
            onCloseDrawer();
            onNavigate(route);
          }}
        />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/* ══ DESKTOP RAIL ═══════════════════════════════════════════════════════════*/

function NavRail({
  currentRoute,
  onNavigate,
}: {
  currentRoute: string;
  onNavigate: (route: string) => void;
}) {
  return (
    <nav className="bezel h-full">
      <div className="bezel-core flex h-full flex-col overflow-hidden">
        <Brand />

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {GROUPS.map(group => (
            <div key={group} className="mb-5 last:mb-0">
              <p className="px-3 pb-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-faint">
                {group}
              </p>
              {NAV_ENTRIES.filter(e => e.group === group).map(entry => (
                <NavLink
                  key={entry.route}
                  entry={entry}
                  active={currentRoute === entry.route}
                  onClick={() => onNavigate(entry.route)}
                />
              ))}
            </div>
          ))}
        </div>

        <SignOutButton />
      </div>
    </nav>
  );
}

function Brand() {
  return (
    <div className="relative shrink-0 overflow-hidden px-6 pb-6 pt-7">
      <span className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.3),transparent_70%)]" />
      <div className="relative flex items-center gap-3">
        {/* The logo gets its own miniature bezel rather than floating bare. */}
        <span className="rounded-2xl border border-hair bg-white/[0.04] p-1">
          <img src="/logo.jpg" alt="" className="size-10 rounded-[0.7rem] object-cover" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-semibold leading-tight tracking-[0.01em] text-ink">
            Dristi Fashions
          </p>
          <p className="text-[9.5px] font-medium uppercase tracking-[0.24em] text-accent-soft/70">
            Admin Console
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * A rail item. The active state is a filled violet plate with a lit left edge;
 * inactive items stay transparent until hovered.
 */
function NavLink({
  entry,
  active,
  onClick,
  delay,
}: {
  entry: NavEntry;
  active: boolean;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={delay !== undefined ? { transitionDelay: `${delay}ms` } : undefined}
      className={`group relative mb-0.5 flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        active ? 'plate-accent text-white' : 'text-ink-soft hover:bg-white/[0.05] hover:text-ink'
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-white/70" />}
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-white/[0.04] text-muted group-hover:bg-white/[0.08] group-hover:text-accent-bright'
        }`}
      >
        <entry.icon size={17} />
      </span>
      <span className="flex-1 truncate text-[13.5px] font-medium tracking-[-0.01em]">{entry.label}</span>
    </button>
  );
}

function SignOutButton({ large = false }: { large?: boolean }) {
  const { logout } = useAuth();
  const confirm = useConfirm();

  const signOut = async () => {
    const ok = await confirm({
      title: 'Sign out',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign out',
      tone: 'primary',
    });
    if (ok) logout();
  };

  return (
    <div className={`shrink-0 ${large ? 'px-0 pt-8' : 'px-3 pb-4 pt-2'}`}>
      <button
        type="button"
        onClick={signOut}
        className={`group flex w-full items-center gap-3 rounded-2xl border border-hair bg-white/[0.03] text-ink-soft transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-error/35 hover:bg-error/10 hover:text-error active:scale-[0.98] ${
          large ? 'px-5 py-4' : 'px-3 py-2.5'
        }`}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/[0.05] transition-colors duration-500 group-hover:bg-error/15">
          <LogOut size={16} />
        </span>
        <span className={`flex-1 text-left font-medium tracking-[-0.01em] ${large ? 'text-[15px]' : 'text-[13.5px]'}`}>
          Sign out
        </span>
      </button>
    </div>
  );
}

/* ══ MOBILE OVERLAY ═════════════════════════════════════════════════════════
   A screen-filling glass sheet. Links slide up out of an invisible box on a
   stagger — they never simply appear. */

function MobileOverlay({
  open,
  currentRoute,
  onClose,
  onNavigate,
}: {
  open: boolean;
  currentRoute: string;
  onClose: () => void;
  onNavigate: (route: string) => void;
}) {
  // Kept mounted through the exit transition so closing is animated too.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), 500);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-3xl transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <div className="min-h-[100dvh] px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl border border-hair bg-white/[0.04] p-1">
              <img src="/logo.jpg" alt="" className="size-9 rounded-[0.6rem] object-cover" />
            </span>
            <p className="font-display text-[15px] font-semibold tracking-[0.01em] text-ink">
              Dristi Fashions
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-11 place-items-center rounded-full border border-hair bg-white/[0.04] text-ink transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.94]"
          >
            <MenuGlyph open />
          </button>
        </div>

        <div className="mt-10">
          {GROUPS.map((group, groupIndex) => {
            const entries = NAV_ENTRIES.filter(e => e.group === group);
            // Continue the stagger across groups so the whole sheet reads as
            // one cascade rather than four restarts.
            const offset = GROUPS.slice(0, groupIndex).reduce(
              (n, g) => n + NAV_ENTRIES.filter(e => e.group === g).length,
              0,
            );
            return (
              <div key={group} className="mb-7 last:mb-0">
                <p
                  className={`pb-2.5 text-[9.5px] font-medium uppercase tracking-[0.24em] text-faint transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                  style={{ transitionDelay: `${offset * 35}ms` }}
                >
                  {group}
                </p>
                {entries.map((entry, i) => (
                  <div
                    key={entry.route}
                    className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-12 opacity-0 blur-[3px]'
                    }`}
                    style={{ transitionDelay: `${(offset + i) * 35 + 60}ms` }}
                  >
                    <NavLink
                      entry={entry}
                      active={currentRoute === entry.route}
                      onClick={() => onNavigate(entry.route)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div
          className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            shown ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`}
          style={{ transitionDelay: `${NAV_ENTRIES.length * 35 + 120}ms` }}
        >
          <SignOutButton large />
        </div>
      </div>
    </div>
  );
}

/* ══ PAGE BODY ══════════════════════════════════════════════════════════════*/

/**
 * The content column. Macro-whitespace by default — the console breathes far
 * more than an admin panel normally would, which is most of why it reads as
 * considered rather than dense.
 */
export function PageBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1180px] px-4 pb-32 pt-10 sm:px-8 sm:pt-12 ${className}`}>
      {children}
    </div>
  );
}
