/**
 * Display helpers shared by the pages: money, dates, and the status label /
 * colour tables the Flutter screens keep in `_sd()` and `_sc()`.
 */
import { getBaseUrl } from './apiClient';

/** `₹1234.50` — two decimals, as every Flutter screen's toStringAsFixed(2). */
export const money = (v: number): string => `₹${(v ?? 0).toFixed(2)}`;

/** `₹1234` — whole rupees, used on the dashboard revenue tile. */
export const money0 = (v: number): string => `₹${Math.round(v ?? 0)}`;

/** Drops a trailing `.00`, matching the `_trim` helper on the settings screens. */
export const trimAmount = (v: number): string => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));

/** `dd/MM/yyyy  HH:mm` in the viewer's timezone — MessagesScreen._when. */
export function whenLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}  ${two(d.getHours())}:${two(d.getMinutes())}`;
}

export const capitalise = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Absolute URL for an image the API returned. Relative paths are resolved
 * against the API base, as CachedNetworkImage does with `ApiConfig.baseUrl`.
 */
export function imageUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
}

/* ── Order status ────────────────────────────────────────────────────────── */

/** `_sd()` on the orders / order-detail / delivery screens. */
export function orderStatusLabel(status: string): string {
  switch (status) {
    case 'pending_payment':
      return 'AWAITING PAYMENT';
    case 'placed':
      return 'PLACED';
    case 'processing':
      return 'PROCESSING';
    case 'dispatched':
      return 'DISPATCHED';
    case 'out_for_delivery':
      return 'OUT FOR DELIVERY';
    case 'delivered':
      return 'DELIVERED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return status.toUpperCase();
  }
}

/** `_sc()` — a CSS colour from the same palette the Flutter screens use. */
export function orderStatusColor(status: string): string {
  switch (status) {
    case 'pending_payment':
      return 'var(--color-warning)';
    case 'placed':
      return 'var(--color-info)';
    case 'processing':
      return 'var(--color-warning)';
    case 'dispatched':
      return 'var(--color-primary)';
    case 'out_for_delivery':
      return 'var(--color-teal)';
    case 'delivered':
      return 'var(--color-success)';
    case 'cancelled':
      return 'var(--color-destructive)';
    default:
      return 'var(--color-muted-foreground)';
  }
}

export function paymentStatusColor(status: string): string {
  if (status === 'paid') return 'var(--color-success)';
  if (status === 'refunded') return 'var(--color-info)';
  return 'var(--color-warning)';
}

/* ── Return status ───────────────────────────────────────────────────────── */

/** `_label()` on the returns screen. */
export function returnStatusLabel(status: string | null): string {
  switch (status) {
    case 'requested':
      return 'REQUESTED';
    case 'replace_requested':
      return 'REPLACE REQUESTED';
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'picked_up':
      return 'PICKED UP';
    default:
      return (status ?? '').toUpperCase();
  }
}

/** `_color()` on the returns screen. */
export function returnStatusColor(status: string | null): string {
  switch (status) {
    case 'requested':
    case 'replace_requested':
      return 'var(--color-warning)';
    case 'approved':
      return 'var(--color-info)';
    case 'rejected':
      return 'var(--color-destructive)';
    case 'picked_up':
      return 'var(--color-success)';
    default:
      return 'var(--color-muted-foreground)';
  }
}
