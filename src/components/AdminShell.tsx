/**
 * The application chrome.
 *
 * A web console's shape, not a phone's: a persistent sidebar you can collapse
 * to icons, a topbar carrying breadcrumbs, the ⌘K trigger and the account menu,
 * and a content column that gets real horizontal room.
 *
 * The page title is no longer a giant banner at the top of every screen — it is
 * a breadcrumb, which is what tells you where you are in a tool you use daily.
 */
import { useEffect, useState, type ReactNode } from 'react';
import {
  Close,
  Command,
  LogOut,
  Monitor,
  Moon,
  PanelLeft,
  Search,
  Sun,
  UserIcon,
} from './icons';
import { NAV_ENTRIES, NAV_GROUPS, type NavEntry } from './navigation';
import { Button, DropdownMenu, Kbd, MenuItem, MenuLabel, MenuSeparator, Tooltip, cx } from './primitives';
import { useAuth, useConfirm } from '../context/AdminContext';
import { useTheme, type ThemeChoice } from '../context/ThemeContext';

const COLLAPSE_KEY = 'dristi_admin_sidebar_collapsed';

export function AdminShell({
  currentRoute,
  breadcrumb,
  drawerOpen,
  onCloseDrawer,
  onOpenDrawer,
  onNavigate,
  onOpenCommand,
  children,
}: {
  currentRoute: string;
  breadcrumb: { label: string; route?: string }[];
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  onOpenDrawer: () => void;
  onNavigate: (route: string) => void;
  onOpenCommand: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* noop */
      }
      return next;
    });
  };

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
    <div className="relative min-h-[100dvh]">
      <div className="mesh-field" aria-hidden />
      <div className="grain-field" aria-hidden />

      <div className="relative z-10 flex">
        {/* Desktop sidebar */}
        <aside
          className={cx(
            'sticky top-0 hidden h-[100dvh] shrink-0 border-r border-border bg-surface/60 backdrop-blur-xl transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:flex lg:flex-col',
            collapsed ? 'w-[4.5rem]' : 'w-[16rem]',
          )}
        >
          <Sidebar
            currentRoute={currentRoute}
            onNavigate={onNavigate}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={onCloseDrawer}
              className="animate-overlay absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="animate-pop absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col border-r border-border bg-surface">
              <Sidebar
                currentRoute={currentRoute}
                onNavigate={route => {
                  onCloseDrawer();
                  onNavigate(route);
                }}
                collapsed={false}
                onClose={onCloseDrawer}
              />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            breadcrumb={breadcrumb}
            onNavigate={onNavigate}
            onOpenDrawer={onOpenDrawer}
            onOpenCommand={onOpenCommand}
          />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

/* ══ TOPBAR ═════════════════════════════════════════════════════════════════*/

function Topbar({
  breadcrumb,
  onNavigate,
  onOpenDrawer,
  onOpenCommand,
}: {
  breadcrumb: { label: string; route?: string }[];
  onNavigate: (route: string) => void;
  onOpenDrawer: () => void;
  onOpenCommand: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-xl sm:px-6">
      <Button
        size="icon"
        variant="ghost"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        className="lg:hidden"
        icon={PanelLeft}
      />

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-[13.5px]">
          {breadcrumb.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span className="text-subtle-foreground">/</span>}
              {crumb.route ? (
                <button
                  type="button"
                  onClick={() => onNavigate(crumb.route!)}
                  className="truncate text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="truncate font-medium text-foreground">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* The search trigger doubles as the ⌘K discovery affordance. */}
      <button
        type="button"
        onClick={onOpenCommand}
        className="hidden items-center gap-2 rounded-lg border border-border bg-card-raised px-3 py-1.5 text-[13px] text-subtle-foreground transition-colors duration-150 hover:border-border-strong hover:text-muted-foreground sm:flex"
      >
        <Search size={14} />
        <span className="pr-8">Search…</span>
        <Kbd>⌘K</Kbd>
      </button>
      <Button size="icon" variant="ghost" onClick={onOpenCommand} aria-label="Search" className="sm:hidden" icon={Search} />

      <ThemeMenu />
      <AccountMenu />
    </header>
  );
}

function ThemeMenu() {
  const { choice, resolved, setChoice } = useTheme();
  const options: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <DropdownMenu
      label="Change theme"
      trigger={
        <span className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
          {resolved === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </span>
      }
    >
      <MenuLabel>Theme</MenuLabel>
      {options.map(option => (
        <MenuItem key={option.id} icon={option.icon} onSelect={() => setChoice(option.id)}>
          <span className="flex items-center gap-2">
            {option.label}
            {choice === option.id && <span className="size-1.5 rounded-full bg-primary" />}
          </span>
        </MenuItem>
      ))}
    </DropdownMenu>
  );
}

function AccountMenu() {
  const { logout } = useAuth();
  const confirm = useConfirm();

  const signOut = async () => {
    const ok = await confirm({
      title: 'Sign out',
      message: 'You will need your admin credentials to get back in.',
      confirmLabel: 'Sign out',
      tone: 'primary',
    });
    if (ok) logout();
  };

  return (
    <DropdownMenu
      label="Account"
      trigger={
        <span className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
          <UserIcon size={17} />
        </span>
      }
    >
      <MenuLabel>Signed in as admin</MenuLabel>
      <MenuSeparator />
      <MenuItem icon={LogOut} onSelect={signOut} destructive>
        Sign out
      </MenuItem>
    </DropdownMenu>
  );
}

/* ══ SIDEBAR ════════════════════════════════════════════════════════════════*/

function Sidebar({
  currentRoute,
  onNavigate,
  collapsed,
  onToggleCollapse,
  onClose,
}: {
  currentRoute: string;
  onNavigate: (route: string) => void;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className={cx('flex h-14 shrink-0 items-center border-b border-border', collapsed ? 'justify-center px-2' : 'gap-2.5 px-4')}>
        <img src="/logo.jpg" alt="" className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-border" />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[14px] font-semibold tracking-[-0.005em] text-foreground">
              Dristi Fashions
            </p>
            <p className="truncate text-[10.5px] font-medium text-subtle-foreground">Admin</p>
          </div>
        )}
        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close navigation" icon={Close} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map(group => {
          const entries = NAV_ENTRIES.filter(e => e.group === group);
          return (
            <div key={group} className="mb-4 last:mb-0">
              {!collapsed && (
                <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
                  {group}
                </p>
              )}
              {collapsed && <div className="mx-2 mb-2 h-px bg-border first:hidden" />}
              {entries.map(entry => (
                <SidebarLink
                  key={entry.route}
                  entry={entry}
                  active={currentRoute === entry.route}
                  collapsed={collapsed}
                  onClick={() => onNavigate(entry.route)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {onToggleCollapse && (
        <div className="shrink-0 border-t border-border p-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cx(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-subtle-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <PanelLeft size={16} className={cx('transition-transform duration-300', collapsed && 'rotate-180')} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </>
  );
}

function SidebarLink({
  entry,
  active,
  collapsed,
  onClick,
}: {
  entry: NavEntry;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative mb-0.5 flex w-full items-center gap-2.5 rounded-lg py-2 text-left text-[13.5px] font-medium transition-colors duration-150',
        collapsed ? 'justify-center px-0' : 'px-2.5',
        active
          ? 'bg-primary/12 text-foreground'
          : 'text-muted-foreground hover:bg-hover hover:text-foreground',
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-r-full bg-primary" />}
      <entry.icon size={17} className={active ? 'text-primary' : undefined} />
      {!collapsed && <span className="truncate">{entry.label}</span>}
    </button>
  );

  // Collapsed to icons, the label has to come back on hover or the rail is a guess.
  return collapsed ? <Tooltip label={entry.label}>{button}</Tooltip> : button;
}

/* ══ PAGE LAYOUT ════════════════════════════════════════════════════════════*/

/**
 * The page header — title, supporting line and the primary action, inline.
 * This is where the "New …" button lives now; a floating action button is a
 * phone affordance and it was covering table rows.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[1.6rem] font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[1.9rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** The filter/search strip that sits above a table. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-4 flex flex-wrap items-center gap-2.5', className)}>{children}</div>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8', className)}>{children}</div>
  );
}

/** Narrower column for forms — a full-width input at 1400px is unreadable. */
export function FormBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('mx-auto w-full max-w-[64rem] px-4 py-7 sm:px-6 lg:px-8', className)}>{children}</div>
  );
}

/**
 * The sticky save bar a form page docks at the bottom, so Save is always
 * reachable without scrolling to the end of a long form.
 */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 flex items-center justify-end gap-2.5 border-t border-border bg-surface/85 px-4 py-3.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {children}
    </div>
  );
}

export { Command as CommandGlyph };
