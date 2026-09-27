/**
 * Every backend endpoint the Admin website calls, in one place.
 *
 * This is a one-for-one port of dristi-admin-app/lib/config/api_config.dart
 * (the paths) and lib/services/admin_service.dart (the calls, including the
 * exact snake_case request bodies and the same tolerant response unwrapping).
 * No endpoint here is new — the website is the Flutter admin app's web-based
 * equivalent, so the backend is untouched.
 */
import { apiDelete, apiGet, apiPost, apiPut, apiUpload, setTokens } from './apiClient';
import type {
  AdminBanner,
  AdminCategory,
  AdminCoupon,
  AdminOrder,
  AdminPaymentMethod,
  AdminProduct,
  AdminUser,
  ApproveReturnResult,
  ContactMessage,
  DashboardStats,
  DeliverySettings,
  DispatchResult,
  FulfillmentOrder,
  NewsletterSubscriber,
  ReferralPurchase,
  ReferralSettings,
  ReferralUserReport,
  TrackingResult,
  UploadResult,
} from '../types';

const P = '/api/v1';

export const paths = {
  adminLogin: `${P}/admin/login`,
  adminDashboard: `${P}/admin/dashboard`,
  adminUsers: `${P}/admin/users`,
  adminOrders: `${P}/admin/orders`,
  adminOrderStatus: (id: string) => `${P}/admin/orders/${id}/status`,
  adminDelivery: `${P}/admin/delivery`,
  adminDeliveryDispatch: (id: string) => `${P}/admin/delivery/${id}/dispatch`,
  adminDeliveryVerify: (id: string) => `${P}/admin/delivery/${id}/verify`,
  adminDeliveryTracking: (id: string) => `${P}/admin/delivery/${id}/tracking`,
  adminReturns: `${P}/admin/returns`,
  adminReturnApprove: (id: string) => `${P}/admin/returns/${id}/approve`,
  adminReturnReject: (id: string) => `${P}/admin/returns/${id}/reject`,
  adminReturnPickup: (id: string) => `${P}/admin/returns/${id}/pickup`,
  adminProducts: `${P}/admin/products`,
  adminProduct: (id: string) => `${P}/admin/products/${id}`,
  adminCategories: `${P}/admin/categories`,
  adminCategory: (id: string) => `${P}/admin/categories/${id}`,
  adminCoupons: `${P}/admin/coupons`,
  adminCoupon: (id: string) => `${P}/admin/coupons/${id}`,
  adminBanners: `${P}/admin/banners`,
  adminBanner: (id: string) => `${P}/admin/banners/${id}`,
  adminPaymentMethods: `${P}/admin/payment-methods`,
  adminPaymentMethod: (id: string) => `${P}/admin/payment-methods/${id}`,
  adminDeliverySettings: `${P}/admin/delivery-settings`,
  adminReferralSettings: `${P}/admin/referral-settings`,
  adminReferralPurchases: `${P}/admin/referral-purchases`,
  adminReferralApprove: (id: string) => `${P}/admin/referral-purchases/${id}/approve`,
  adminReferralReject: (id: string) => `${P}/admin/referral-purchases/${id}/reject`,
  adminReferralUserReport: `${P}/admin/referral-reports/user`,
  adminContactMessages: `${P}/admin/contact-messages`,
  adminContactMessage: (id: string) => `${P}/admin/contact-messages/${id}`,
  adminContactMessageRead: (id: string, isRead = true) =>
    `${P}/admin/contact-messages/${id}/read?is_read=${isRead}`,
  adminNewsletterSubscribers: `${P}/admin/newsletter-subscribers`,

  // Public endpoints (used as a fallback for the category list, as the app does)
  categories: `${P}/categories`,

  upload: `${P}/upload`,
  uploadVideo: `${P}/upload/video`,
} as const;

/**
 * Some list endpoints answer with a bare array and others with `{ key: [...] }`.
 * The Flutter service accepts either; so does this, so the two stay in step if
 * the backend's envelope ever changes.
 */
function asList<T>(data: unknown, ...keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

/* ── Auth ────────────────────────────────────────────────────────────────── */

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

/** Admin sign-in. Stores both tokens on success, as AdminService.login does. */
export async function login(email: string, password: string): Promise<void> {
  const data = await apiPost<TokenResponse>(paths.adminLogin, { email, password });
  setTokens(data.accessToken, data.refreshToken);
}

/* ── Dashboard & users ───────────────────────────────────────────────────── */

export const getDashboard = (): Promise<DashboardStats> => apiGet<DashboardStats>(paths.adminDashboard);

export async function getUsers(): Promise<AdminUser[]> {
  return asList<AdminUser>(await apiGet<unknown>(paths.adminUsers), 'users');
}

/* ── Products ────────────────────────────────────────────────────────────── */

export async function getProducts(opts: { gender?: string } = {}): Promise<AdminProduct[]> {
  const query: Record<string, string> = {};
  if (opts.gender) query.gender = opts.gender;
  return asList<AdminProduct>(await apiGet<unknown>(paths.adminProducts, query), 'products');
}

export const getProduct = (id: string): Promise<AdminProduct> =>
  apiGet<AdminProduct>(paths.adminProduct(id));

export const createProduct = (data: Record<string, unknown>): Promise<AdminProduct> =>
  apiPost<AdminProduct>(paths.adminProducts, data);

export const updateProduct = (id: string, data: Record<string, unknown>): Promise<AdminProduct> =>
  apiPut<AdminProduct>(paths.adminProduct(id), data);

export const deleteProduct = (id: string): Promise<unknown> => apiDelete(paths.adminProduct(id));

/* ── Categories ──────────────────────────────────────────────────────────── */

/**
 * Admin category list, falling back to the public endpoint when the admin one
 * fails or comes back empty — exactly what AdminService.getCategories does, so
 * the form's category dropdown can never end up empty.
 */
export async function getCategories(opts: { gender?: string } = {}): Promise<AdminCategory[]> {
  const query: Record<string, string> = {};
  if (opts.gender) query.gender = opts.gender;

  try {
    const admin = asList<AdminCategory>(
      await apiGet<unknown>(paths.adminCategories, query),
      'categories',
      'data',
    );
    if (admin.length > 0) return admin;
  } catch {
    /* fall through to the public list */
  }

  return asList<AdminCategory>(await apiGet<unknown>(paths.categories, query), 'categories');
}

export const getCategory = (id: string): Promise<AdminCategory> =>
  apiGet<AdminCategory>(paths.adminCategory(id));

export const createCategory = (data: Record<string, unknown>): Promise<AdminCategory> =>
  apiPost<AdminCategory>(paths.adminCategories, data);

export const updateCategory = (id: string, data: Record<string, unknown>): Promise<AdminCategory> =>
  apiPut<AdminCategory>(paths.adminCategory(id), data);

export const deleteCategory = (id: string): Promise<unknown> => apiDelete(paths.adminCategory(id));

/* ── Orders ──────────────────────────────────────────────────────────────── */

export async function getOrders(): Promise<AdminOrder[]> {
  return asList<AdminOrder>(await apiGet<unknown>(paths.adminOrders), 'orders');
}

export const updateOrderStatus = (orderId: string, status: string): Promise<unknown> =>
  apiPut(paths.adminOrderStatus(orderId), { status });

/* ── Fulfilment: dispatch + delivery OTP, and the returns queue ──────────── */

export const getDeliveryOrders = (): Promise<FulfillmentOrder[]> =>
  apiGet<FulfillmentOrder[]>(paths.adminDelivery);

/**
 * Dispatches the order; the response carries the delivery OTP the operator
 * relays to the customer. The OTP is never stored — it is a one-time relay.
 */
export const dispatchOrder = (orderId: string): Promise<DispatchResult> =>
  apiPost<DispatchResult>(paths.adminDeliveryDispatch(orderId));

export const verifyDeliveryOtp = (orderId: string, otp: string): Promise<unknown> =>
  apiPost(paths.adminDeliveryVerify(orderId), { otp });

/** Live ShipRocket tracking for an in-transit order (fresh AWB status). */
export const getDeliveryTracking = (orderId: string): Promise<TrackingResult> =>
  apiGet<TrackingResult>(paths.adminDeliveryTracking(orderId));

export const getReturnOrders = (): Promise<FulfillmentOrder[]> =>
  apiGet<FulfillmentOrder[]>(paths.adminReturns);

/** Approves a return; the response carries the pickup OTP to relay. */
export const approveReturn = (orderId: string): Promise<ApproveReturnResult> =>
  apiPost<ApproveReturnResult>(paths.adminReturnApprove(orderId));

export const rejectReturn = (orderId: string, reason: string): Promise<unknown> =>
  apiPost(paths.adminReturnReject(orderId), { reason });

export const verifyReturnPickup = (orderId: string, otp: string): Promise<unknown> =>
  apiPost(paths.adminReturnPickup(orderId), { otp });

/* ── Coupons ─────────────────────────────────────────────────────────────── */

export async function getCoupons(): Promise<AdminCoupon[]> {
  return asList<AdminCoupon>(await apiGet<unknown>(paths.adminCoupons), 'coupons');
}

export const getCoupon = (id: string): Promise<AdminCoupon> => apiGet<AdminCoupon>(paths.adminCoupon(id));

export const createCoupon = (data: Record<string, unknown>): Promise<AdminCoupon> =>
  apiPost<AdminCoupon>(paths.adminCoupons, data);

export const updateCoupon = (id: string, data: Record<string, unknown>): Promise<AdminCoupon> =>
  apiPut<AdminCoupon>(paths.adminCoupon(id), data);

export const deleteCoupon = (id: string): Promise<unknown> => apiDelete(paths.adminCoupon(id));

/* ── Banners ─────────────────────────────────────────────────────────────── */

export async function getBanners(): Promise<AdminBanner[]> {
  return asList<AdminBanner>(await apiGet<unknown>(paths.adminBanners), 'banners', 'data');
}

export const getBanner = (id: string): Promise<AdminBanner> => apiGet<AdminBanner>(paths.adminBanner(id));

export const createBanner = (data: Record<string, unknown>): Promise<AdminBanner> =>
  apiPost<AdminBanner>(paths.adminBanners, data);

export const updateBanner = (id: string, data: Record<string, unknown>): Promise<AdminBanner> =>
  apiPut<AdminBanner>(paths.adminBanner(id), data);

export const deleteBanner = (id: string): Promise<unknown> => apiDelete(paths.adminBanner(id));

/* ── Payment methods ─────────────────────────────────────────────────────── */

export const getPaymentMethods = (): Promise<AdminPaymentMethod[]> =>
  apiGet<AdminPaymentMethod[]>(paths.adminPaymentMethods);

export const getPaymentMethod = (id: string): Promise<AdminPaymentMethod> =>
  apiGet<AdminPaymentMethod>(paths.adminPaymentMethod(id));

export const createPaymentMethod = (data: Record<string, unknown>): Promise<AdminPaymentMethod> =>
  apiPost<AdminPaymentMethod>(paths.adminPaymentMethods, data);

export const updatePaymentMethod = (
  id: string,
  data: Record<string, unknown>,
): Promise<AdminPaymentMethod> => apiPut<AdminPaymentMethod>(paths.adminPaymentMethod(id), data);

export const deletePaymentMethod = (id: string): Promise<unknown> =>
  apiDelete(paths.adminPaymentMethod(id));

/* ── Delivery settings (store-wide) ──────────────────────────────────────── */

export const getDeliverySettings = (): Promise<DeliverySettings> =>
  apiGet<DeliverySettings>(paths.adminDeliverySettings);

export const updateDeliverySettings = (data: Record<string, unknown>): Promise<DeliverySettings> =>
  apiPut<DeliverySettings>(paths.adminDeliverySettings, data);

/* ── Refer & earn ────────────────────────────────────────────────────────── */

export const getReferralSettings = (): Promise<ReferralSettings> =>
  apiGet<ReferralSettings>(paths.adminReferralSettings);

export const updateReferralSettings = (data: Record<string, unknown>): Promise<ReferralSettings> =>
  apiPut<ReferralSettings>(paths.adminReferralSettings, data);

export const getReferralPurchases = (status?: string): Promise<ReferralPurchase[]> =>
  apiGet<ReferralPurchase[]>(paths.adminReferralPurchases, status ? { status } : undefined);

/**
 * Approve a commission. Sending `rewardAmount` pays exactly that; otherwise the
 * backend works it out from `rewardPercentage` of the purchase.
 */
export const approveReferral = (
  id: string,
  opts: { rewardPercentage: number; rewardAmount?: number | null },
): Promise<unknown> =>
  apiPut(paths.adminReferralApprove(id), {
    reward_percentage: opts.rewardPercentage,
    ...(opts.rewardAmount != null ? { reward_amount: opts.rewardAmount } : {}),
  });

export const rejectReferral = (id: string): Promise<unknown> => apiPut(paths.adminReferralReject(id));

export const getReferralUserReport = (): Promise<ReferralUserReport[]> =>
  apiGet<ReferralUserReport[]>(paths.adminReferralUserReport);

/* ── Website enquiries and newsletter signups ────────────────────────────── */

export const getContactMessages = (): Promise<ContactMessage[]> =>
  apiGet<ContactMessage[]>(paths.adminContactMessages);

export const markContactMessageRead = (id: string, isRead = true): Promise<unknown> =>
  apiPut(paths.adminContactMessageRead(id, isRead));

export const deleteContactMessage = (id: string): Promise<unknown> =>
  apiDelete(paths.adminContactMessage(id));

export const getNewsletterSubscribers = (): Promise<NewsletterSubscriber[]> =>
  apiGet<NewsletterSubscriber[]>(paths.adminNewsletterSubscribers);

/* ── Uploads ─────────────────────────────────────────────────────────────── */

/** `folder` selects the S3 prefix (banners / products / categories); validated server-side. */
export const uploadImage = (file: File, folder: string): Promise<UploadResult> =>
  apiUpload<UploadResult>(paths.upload, file, { folder });

/** The video endpoint fixes its folder to 'videos' server-side, so none is sent. */
export const uploadVideo = (file: File): Promise<UploadResult> =>
  apiUpload<UploadResult>(paths.uploadVideo, file);
