/**
 * DTOs for every admin endpoint, one-for-one with dristi-admin-app/lib/models.
 *
 * The API speaks snake_case; `apiClient` camelCases responses on the way in, so
 * these describe the camelCased shape. REQUEST bodies are written in snake_case
 * by hand in `lib/api.ts` — exactly as the Flutter app sends them.
 */

/* ── Dashboard ───────────────────────────────────────────────────────────── */

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

/* ── Users ───────────────────────────────────────────────────────────────── */

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  referralCode: string | null;
  walletBalance: number;
  isVerified: boolean;
  createdAt: string | null;
}

/* ── Products ────────────────────────────────────────────────────────────── */

export interface AdminVariant {
  id?: string | null;
  size: string | null;
  color: string | null;
  stock: number;
  price: number | null;
}

export interface AdminImage {
  id?: string | null;
  imageUrl: string;
  isPrimary: boolean;
}

export interface AdminVideo {
  id?: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
}

export interface AdminProduct {
  id: string;
  title: string;
  sku: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  featured: boolean;
  isActive: boolean;
  isReplaceable: boolean;
  isReturnable: boolean;
  categoryName: string | null;
  primaryImage: string | null;
  categoryId: string | null;
  description: string | null;
  brand: string | null;
  gender: string | null;
  updatedAt: string | null;
  variants: AdminVariant[];
  images: AdminImage[];
  videos: AdminVideo[];
}

/* ── Categories ──────────────────────────────────────────────────────────── */

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  parentId: string | null;
  gender: string | null;
  createdAt: string | null;
}

/** AdminCategory.mainCategoryNames */
export const MAIN_CATEGORY_NAMES = ['Men', 'Women', 'Kids'] as const;

/** AdminCategory.genderOptions */
export const GENDER_OPTIONS = ['men', 'women', 'kids', 'unisex'] as const;

/** The three genders a category can actually be filed under (unisex aside). */
export const SPECIFIC_GENDERS = ['men', 'women', 'kids'] as const;

export const isMainCategoryName = (name: string): boolean =>
  MAIN_CATEGORY_NAMES.some(n => n.toLowerCase() === name.trim().toLowerCase());

export const isParentCategory = (c: AdminCategory): boolean => c.parentId === null;

/* ── Orders ──────────────────────────────────────────────────────────────── */

export interface AdminOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  userId: string;
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  finalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  shippingAddress: string | null;
  items: AdminOrderItem[];
  createdAt: string | null;
}

/** models/order.dart — the statuses an admin can set by hand. */
export const ORDER_STATUSES = [
  'placed',
  'processing',
  'dispatched',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

/* ── Coupons ─────────────────────────────────────────────────────────────── */

export interface AdminCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  expiryDate: string | null;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string | null;
}

/* ── Banners ─────────────────────────────────────────────────────────────── */

export interface AdminBanner {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  linkText: string | null;
  section: string;
  sortOrder: number;
  isActive: boolean;
}

/* ── Payment methods ─────────────────────────────────────────────────────── */

export interface AdminPaymentMethod {
  id: string;
  code: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  gateway: string;
  regions: string;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Gateways the Admin app can pick from. Cashfree is wired up today; the field
 * exists so adding a second one is configuration, not a schema change.
 */
export const GATEWAY_OPTIONS = ['cashfree'] as const;

/** AdminPaymentMethod.regionsLabel */
export const regionsLabel = (regions: string): string =>
  regions.trim() === '*' ? 'ALL REGIONS' : regions.toUpperCase();

/* ── Delivery settings ───────────────────────────────────────────────────── */

export interface DeliverySettings {
  enabled: boolean;
  fee: number;
  stateFees: Record<string, number> | null;
  freeAbove: number | null;
}

/* ── Fulfilment (delivery + returns dashboards) ──────────────────────────── */

export interface FulfillmentUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
}

export interface FulfillmentItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  user: FulfillmentUser;
  orderStatus: string;
  paymentStatus: string;
  returnStatus: string | null;
  returnReason: string | null;
  returnAdminNote: string | null;
  shippingAddress: string | null;
  finalAmount: number;
  createdAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  returnEvidence: string[];
  items: FulfillmentItem[];
  // ShipRocket courier tracking (populated once the order is dispatched).
  awbCode: string | null;
  courierName: string | null;
  shipmentStatus: string | null;
  trackingUrl: string | null;
  // True when the order has been pushed to ShipRocket at checkout.
  shiprocketSynced: boolean;
}

/* FulfillmentOrder's computed getters, as free functions. */
export const needsDispatch = (o: FulfillmentOrder): boolean =>
  o.orderStatus === 'placed' || o.orderStatus === 'processing';
export const inTransit = (o: FulfillmentOrder): boolean =>
  o.orderStatus === 'dispatched' || o.orderStatus === 'out_for_delivery';
export const hasPendingReturn = (o: FulfillmentOrder): boolean =>
  o.returnStatus === 'requested' || o.returnStatus === 'replace_requested';
export const returnApproved = (o: FulfillmentOrder): boolean => o.returnStatus === 'approved';

/** What `POST /admin/delivery/{id}/dispatch` answers with. */
export interface DispatchResult {
  deliveryOtp?: string;
  courier?: { awbCode?: string; courierName?: string };
  courierError?: string;
}

/** What `POST /admin/returns/{id}/approve` answers with. */
export interface ApproveReturnResult {
  pickupOtp?: string;
}

/** What `GET /admin/delivery/{id}/tracking` answers with. */
export interface TrackingResult {
  shipmentStatus?: string | null;
}

/* ── Referrals ───────────────────────────────────────────────────────────── */

export interface ReferralSettings {
  enabled: boolean;
  commissionPercentage: number;
}

export interface ReferralPurchase {
  id: string;
  referrerName: string;
  referrerEmail: string;
  referrerCode: string | null;
  referredUserName: string | null;
  referredUserEmail: string | null;
  productName: string | null;
  orderId: string;
  orderNumber: string | null;
  purchaseAmount: number;
  rewardAmount: number;
  rewardPercentage: number;
  status: string;
  createdAt: string | null;
}

export const isPendingReferral = (p: ReferralPurchase): boolean => p.status === 'pending';

export interface ReferralUserReport {
  userId: string;
  userName: string;
  userEmail: string;
  totalClicks: number;
  totalPurchases: number;
  totalEarnings: number;
  pendingRewards: number;
}

/* ── Contact / newsletter ────────────────────────────────────────────────── */

export interface ContactMessage {
  id: string;
  fullName: string;
  email: string;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string | null;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  createdAt: string | null;
}

/* ── Uploads ─────────────────────────────────────────────────────────────── */

export interface UploadResult {
  url: string;
  fileName?: string;
  storageType?: string;
}
