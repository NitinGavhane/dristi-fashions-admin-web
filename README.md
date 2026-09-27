# dristi-fashions-admin-web

The **Admin Website** for Dristi Fashions — the web equivalent of the
`dristi-admin-app` Flutter panel, with the same UI, the same pages and the same
features, talking to the same `dristi-backend` endpoints.

**No backend change was needed to ship this.** Every call goes to an endpoint the
Flutter admin app already uses, with the same request bodies, the same auth and
the same business logic. The API already answers `access-control-allow-origin: *`,
so the new origin works as-is.

## Stack

React 19 + Vite 6 + Tailwind v4 + TypeScript — the same stack as the customer
storefront in `dristi-fashions-web`, so the two sites are maintained the same way.

```bash
npm install
npm run dev      # http://localhost:3100
npm run lint     # tsc --noEmit
npm run build    # -> dist/
npm run deploy   # build + S3 sync + CloudFront invalidation
```

## Pages

Every screen in `dristi-admin-app/lib/screens` has a counterpart here. The
Flutter named route (which passed the record id as `arguments`) becomes a real
path, so admin pages are linkable and the browser Back button works.

| Feature | Flutter screen | Website route |
| --- | --- | --- |
| Sign in | `login_screen.dart` | `/login` |
| Dashboard | `dashboard_screen.dart` | `/dashboard` |
| Users | `users_screen.dart` | `/users` |
| Products | `products_screen.dart` | `/products` |
| Product create/edit | `product_form_screen.dart` | `/products/new`, `/products/:id` |
| Orders | `orders_screen.dart` | `/orders` |
| Order detail + status | `order_detail_screen.dart` | `/orders/:id` |
| Categories | `categories_screen.dart` | `/categories` |
| Category create/edit | `category_form_screen.dart` | `/categories/new`, `/categories/:id` |
| Banners | `banners_screen.dart` | `/banners` |
| Banner create/edit | `banner_form_screen.dart` | `/banners/new`, `/banners/:id` |
| Coupons | `coupons_screen.dart` | `/coupons` |
| Coupon create/edit | `coupon_form_screen.dart` | `/coupons/new`, `/coupons/:id` |
| Payment methods | `payment_methods_screen.dart` | `/payment-methods` |
| Payment method create/edit | `payment_method_form_screen.dart` | `/payment-methods/new`, `/payment-methods/:id` |
| Delivery (dispatch + OTP) | `delivery_screen.dart` | `/delivery` |
| Returns queue | `returns_screen.dart` | `/returns` |
| Delivery charge settings | `delivery_settings_screen.dart` | `/delivery-settings` |
| Refer & earn | `referrals_screen.dart` | `/referrals` |
| Enquiries & subscribers | `messages_screen.dart` | `/messages` |

## How it maps to the Flutter app

| Flutter | Website |
| --- | --- |
| `config/api_config.dart` (paths) | `src/lib/api.ts` — `paths` |
| `services/admin_service.dart` (calls) | `src/lib/api.ts` |
| `services/api_service.dart` (Dio, tokens, 401 refresh) | `src/lib/apiClient.ts` |
| `services/image_upload_service.dart` (upload rules) | `src/lib/uploads.ts` |
| `providers/auth_provider.dart` | `src/context/AdminContext.tsx` |
| `models/*.dart` | `src/types.ts` |
| `config/theme.dart` (AppColors, Responsive) | `src/index.css` — `@theme` tokens |
| `widgets.dart` | `src/components/ui.tsx` + `AdminShell.tsx` + `BannerCropPreview.tsx` |
| `app.dart` (routes, splash gate) | `src/App.tsx` |

Behaviour deliberately carried over, because the backend or the storefront
depends on it:

- **Product discount field** is the rupees *off*, not the final price. It is
  saved as `discount_price = price − amount` and read back the same way.
- **Product gender** is never picked by hand — it is inherited from the chosen
  category, so a men's category can never hold a "women" product.
- **Creating a top-level Men / Women / Kids category** also seeds its two default
  subcategories (`All` and one named after the gender), which the storefront's
  gender tabs expect to find.
- **Delivery settings**: the toggle is the only thing that decides `enabled`, and
  a state fee is pre-filled only when the seller actually saved one before — so
  "delivery off" survives a reload, and a flat fee does not silently become
  distance-based pricing.
- **Referral commissions** are never automatic; each is approved by hand, with
  the percentage (or a flat rupee override) editable per sale.
- **Return rejection** requires a reason, because it is sent to the customer.

One place the website differs, on purpose: in the Flutter category list a
gender-less parent category is rendered under both "Other" and "Ungrouped". Here
it appears once — the same set of categories, minus the double entry.

## Configuration

`VITE_API_BASE_URL` selects the backend (see `.env.example`). With no `.env` the
build falls back to the AWS API, `https://d100c6f2kgsym4.cloudfront.net` — the
same default `ApiConfig.baseUrl` uses in the Flutter app.

Session tokens live in `localStorage` under `dristi_admin_access_token` /
`dristi_admin_refresh_token`. The keys are distinct from the storefront's, so an
admin session and a shopper session can coexist in one browser. An expired access
token is refreshed and the request replayed once; only a failed refresh signs the
admin out.

## Deploy

`npm run deploy` ships the build to the **same** S3 bucket and CloudFront
distribution the Flutter admin web build used, so the admin URL does not change:

- bucket `dristi-admin-web-078525505229` (ap-south-1)
- distribution `E3BVP4DZHKPN5L` → <https://d30ai0wvr18s47.cloudfront.net>

The distribution already maps 403/404 → `/index.html` with a 200, which is what
this SPA's `pushState` routes need, so nothing about it has to change to swap
Flutter for React. Credentials come from your local `aws` CLI config; nothing
secret is committed.
