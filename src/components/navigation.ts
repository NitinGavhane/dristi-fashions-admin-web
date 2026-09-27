/**
 * The console's destinations, in one place.
 *
 * Kept out of AdminShell so the sidebar, the command palette and the breadcrumb
 * can all read the same list without importing each other in a circle.
 */
import {
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

export type NavGroup = 'Overview' | 'Catalogue' | 'Fulfilment' | 'Growth';

export interface NavEntry {
  icon: Icon;
  label: string;
  route: string;
  group: NavGroup;
}

export const NAV_GROUPS: NavGroup[] = ['Overview', 'Catalogue', 'Fulfilment', 'Growth'];

export const NAV_ENTRIES: NavEntry[] = [
  { icon: NavDashboard, label: 'Dashboard', route: '/dashboard', group: 'Overview' },
  { icon: NavOrders, label: 'Orders', route: '/orders', group: 'Overview' },
  { icon: NavUsers, label: 'Customers', route: '/users', group: 'Overview' },

  { icon: NavProducts, label: 'Products', route: '/products', group: 'Catalogue' },
  { icon: NavCategories, label: 'Categories', route: '/categories', group: 'Catalogue' },
  { icon: NavBanners, label: 'Banners', route: '/banners', group: 'Catalogue' },

  { icon: NavDelivery, label: 'Delivery', route: '/delivery', group: 'Fulfilment' },
  { icon: NavReturns, label: 'Returns', route: '/returns', group: 'Fulfilment' },
  { icon: NavDeliverySettings, label: 'Delivery settings', route: '/delivery-settings', group: 'Fulfilment' },
  { icon: NavPayments, label: 'Payment methods', route: '/payment-methods', group: 'Fulfilment' },

  { icon: NavCoupons, label: 'Coupons', route: '/coupons', group: 'Growth' },
  { icon: NavReferrals, label: 'Referrals', route: '/referrals', group: 'Growth' },
  { icon: NavMessages, label: 'Messages', route: '/messages', group: 'Growth' },
];

/** The list route a pushed form or detail page belongs to. */
export function sectionFor(pathname: string): NavEntry | undefined {
  return NAV_ENTRIES.find(e => pathname === e.route || pathname.startsWith(`${e.route}/`));
}

/** Breadcrumb trail for a path — section, then the leaf when there is one. */
export function breadcrumbFor(pathname: string, leafLabel?: string): { label: string; route?: string }[] {
  const section = sectionFor(pathname);
  if (!section) return [{ label: 'Dashboard', route: '/dashboard' }];
  if (pathname === section.route) return [{ label: section.label }];
  return [{ label: section.label, route: section.route }, { label: leafLabel ?? 'Details' }];
}
