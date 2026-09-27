/**
 * Route-level scaffold — a port of AdminScaffold + AdminNavPanel + FashionNavDrawer
 * in dristi-admin-app/lib/widgets.dart.
 *
 * Compact layouts get the hamburger and a slide-in drawer; from `lg` up the
 * sidebar is permanent, which is what the Flutter app already does for desktop
 * browsers (Responsive.isDesktop, breakpoint 900px).
 */
import React, { useEffect } from 'react';
import {
  GalleryHorizontalEnd,
  Gift,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  PackageOpen,
  ReceiptText,
  Shapes,
  Share2,
  SlidersHorizontal,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth, useConfirm } from '../context/AdminContext';

export interface NavEntry {
  icon: LucideIcon;
  label: string;
  route: string;
}

/** The sidebar, in the Flutter app's order. */
export const NAV_ENTRIES: NavEntry[] = [
  { icon: LayoutDashboard, label: 'Dashboard', route: '/dashboard' },
  { icon: Users, label: 'Users', route: '/users' },
  { icon: Package, label: 'Products', route: '/products' },
  { icon: ReceiptText, label: 'Orders', route: '/orders' },
  { icon: Shapes, label: 'Categories', route: '/categories' },
  { icon: GalleryHorizontalEnd, label: 'Banners', route: '/banners' },
  { icon: Gift, label: 'Coupons', route: '/coupons' },
  { icon: Wallet, label: 'Payment Methods', route: '/payment-methods' },
  { icon: Truck, label: 'Delivery', route: '/delivery' },
  { icon: PackageOpen, label: 'Returns', route: '/returns' },
  { icon: SlidersHorizontal, label: 'Delivery Settings', route: '/delivery-settings' },
  { icon: Share2, label: 'Referrals', route: '/referrals' },
  { icon: Mail, label: 'Messages', route: '/messages' },
];

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
  // Escape closes the drawer, and the page behind it must not scroll while the
  // overlay is up.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseDrawer();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen, onCloseDrawer]);

  return (
    <div className="min-h-dvh bg-bg lg:flex">
      {/* Permanent desktop sidebar */}
      <aside className="hidden w-[280px] shrink-0 border-r border-hair-light lg:block">
        <div className="sticky top-0 h-dvh">
          <NavPanel currentRoute={currentRoute} onNavigate={onNavigate} inDrawer={false} />
        </div>
      </aside>

      {/* Compact drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={onCloseDrawer}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-[300px] max-w-[85vw] shadow-lg-soft">
            <NavPanel
              currentRoute={currentRoute}
              onNavigate={route => {
                onCloseDrawer();
                onNavigate(route);
              }}
              inDrawer
              onClose={onCloseDrawer}
            />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function NavPanel({
  currentRoute,
  onNavigate,
  inDrawer,
  onClose,
}: {
  currentRoute: string;
  onNavigate: (route: string) => void;
  inDrawer: boolean;
  onClose?: () => void;
}) {
  const { logout } = useAuth();
  const confirm = useConfirm();

  const signOut = async () => {
    const ok = await confirm({
      title: 'SIGN OUT',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign out',
      tone: 'primary',
    });
    if (ok) logout();
  };

  return (
    <nav className="flex h-full flex-col bg-gradient-to-b from-surface to-surface-alt">
      <div className="card-surface relative border-b border-hair-light px-6 py-8 shadow-sm-soft">
        {inDrawer && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="absolute right-4 top-4 rounded p-1 text-muted transition hover:text-ink"
          >
            <X size={18} />
          </button>
        )}
        <img
          src="/logo.jpg"
          alt=""
          className="size-14 rounded-btn border border-coral/40 object-cover shadow-violet"
        />
        <p className="mt-4 font-display text-[17px] font-black tracking-[2px] text-ink">DRISTI FASHIONS</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="block h-0.5 w-5 rounded-sm bg-gradient-to-r from-gold to-gold-80" />
          <span className="label-caps text-[9px] tracking-[4px] text-gold">ADMIN PANEL</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_ENTRIES.map(entry => {
          const active = currentRoute === entry.route;
          return (
            <button
              key={entry.route}
              type="button"
              onClick={() => onNavigate(entry.route)}
              aria-current={active ? 'page' : undefined}
              className={`mb-0.5 flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition ${
                active ? 'plate-nav-active shadow-violet' : 'hover:bg-bg-alt'
              }`}
            >
              <span
                className={`grid size-[34px] shrink-0 place-items-center rounded-input border ${
                  active ? 'border-white/30 bg-white/20 text-white' : 'border-hair-light bg-bg-alt text-muted'
                }`}
              >
                <entry.icon size={17} />
              </span>
              <span
                className={`font-display text-[13px] tracking-[0.2px] ${
                  active ? 'font-bold text-white' : 'font-semibold text-ink-soft'
                }`}
              >
                {entry.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-4 pt-2">
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-input bg-btn px-4 py-3.5 text-white shadow-violet transition hover:brightness-110"
        >
          <span className="grid size-8 place-items-center rounded-md bg-white/20">
            <LogOut size={16} />
          </span>
          <span className="label-caps text-[11px] font-extrabold tracking-[2.5px]">Sign out</span>
        </button>
      </div>
    </nav>
  );
}

/**
 * Page body wrapper — the horizontal gutters and bottom breathing room the
 * Flutter screens apply with `EdgeInsets.fromLTRB(16, 8, 16, 80)`.
 */
export function PageBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-[1100px] px-4 pb-24 pt-4 sm:px-6 ${className}`}>{children}</div>;
}
