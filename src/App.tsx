/**
 * Router and auth gate for the admin panel.
 *
 * Routing is hand-rolled HTML5 pushState, the same approach the customer
 * storefront uses, so there is no extra dependency and real paths work. The
 * routes mirror the Flutter app's named routes in lib/app.dart, with the form
 * screens' `arguments: id` becoming a path segment:
 *
 *   Flutter                                  Website
 *   /products + arguments: id        ->       /products/:id   (or /products/new)
 *   /order-detail + arguments: id    ->       /orders/:id
 */
import { useCallback, useEffect, useState } from 'react';
import { AdminProvider, useAuth } from './context/AdminContext';
import { AdminShell, NAV_ENTRIES } from './components/AdminShell';
import { BrandLoader } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryFormPage } from './pages/CategoryFormPage';
import { BannersPage } from './pages/BannersPage';
import { BannerFormPage } from './pages/BannerFormPage';
import { CouponsPage } from './pages/CouponsPage';
import { CouponFormPage } from './pages/CouponFormPage';
import { PaymentMethodsPage } from './pages/PaymentMethodsPage';
import { PaymentMethodFormPage } from './pages/PaymentMethodFormPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { DeliverySettingsPage } from './pages/DeliverySettingsPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { MessagesPage } from './pages/MessagesPage';

const HOME = '/dashboard';

/** The list route a pushed form/detail page belongs to, for the sidebar highlight. */
function sectionFor(pathname: string): string {
  const match = NAV_ENTRIES.find(e => pathname === e.route || pathname.startsWith(`${e.route}/`));
  return match?.route ?? HOME;
}

export default function App() {
  return (
    <AdminProvider>
      <Router />
    </AdminProvider>
  );
}

function Router() {
  const { ready, isAuthenticated } = useAuth();
  const [pathname, setPathname] = useState(() => window.location.pathname || HOME);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname || HOME);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setPathname(path);
    window.scrollTo({ top: 0 });
  }, []);

  const goBack = useCallback(() => {
    // A pushed page normally has history to pop; a deep link opened directly
    // does not, so fall back to that page's own list.
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(sectionFor(window.location.pathname));
    }
  }, [navigate]);

  // Signing out (or a dead session) must not leave a stale admin path in the
  // address bar, and signing in should land on the dashboard.
  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated && pathname !== '/login') {
      window.history.replaceState({}, '', '/login');
      setPathname('/login');
    } else if (isAuthenticated && pathname === '/login') {
      window.history.replaceState({}, '', HOME);
      setPathname(HOME);
    }
  }, [ready, isAuthenticated, pathname]);

  if (!ready) return <BrandLoader label="Dristi Fashions" />;
  if (!isAuthenticated) return <LoginPage />;

  const page = renderPage(pathname, navigate, goBack, () => setDrawerOpen(true));

  return (
    <AdminShell
      currentRoute={sectionFor(pathname)}
      drawerOpen={drawerOpen}
      onCloseDrawer={() => setDrawerOpen(false)}
      onNavigate={navigate}
      children={page}
    />
  );
}

function renderPage(
  pathname: string,
  onNavigate: (path: string) => void,
  onBack: () => void,
  onMenu: () => void,
) {
  const list = { onNavigate, onMenu };

  switch (pathname) {
    case '/':
    case '/dashboard':
      return <DashboardPage {...list} />;
    case '/users':
      return <UsersPage {...list} />;
    case '/products':
      return <ProductsPage {...list} />;
    case '/orders':
      return <OrdersPage {...list} />;
    case '/categories':
      return <CategoriesPage {...list} />;
    case '/banners':
      return <BannersPage {...list} />;
    case '/coupons':
      return <CouponsPage {...list} />;
    case '/payment-methods':
      return <PaymentMethodsPage {...list} />;
    case '/delivery':
      return <DeliveryPage {...list} />;
    case '/returns':
      return <ReturnsPage {...list} />;
    case '/delivery-settings':
      return <DeliverySettingsPage {...list} />;
    case '/referrals':
      return <ReferralsPage {...list} />;
    case '/messages':
      return <MessagesPage {...list} />;
    default:
      break;
  }

  // Dynamic segments. `new` means a create form; anything else is the id of the
  // record to edit. Keying on the id remounts the page when moving between two
  // records, which resets the form's local state.
  const id = (prefix: string): string | null => {
    const rest = pathname.slice(prefix.length);
    return rest === 'new' ? null : rest;
  };

  if (pathname.startsWith('/products/')) {
    const productId = id('/products/');
    return <ProductFormPage key={pathname} productId={productId} onNavigate={onNavigate} onBack={onBack} />;
  }

  if (pathname.startsWith('/orders/')) {
    const orderId = pathname.slice('/orders/'.length);
    return <OrderDetailPage key={pathname} orderId={orderId} onNavigate={onNavigate} onBack={onBack} />;
  }

  if (pathname.startsWith('/categories/')) {
    return <CategoryFormPage key={pathname} categoryId={id('/categories/')} onNavigate={onNavigate} onBack={onBack} />;
  }

  if (pathname.startsWith('/banners/')) {
    return <BannerFormPage key={pathname} bannerId={id('/banners/')} onNavigate={onNavigate} onBack={onBack} />;
  }

  if (pathname.startsWith('/coupons/')) {
    return <CouponFormPage key={pathname} couponId={id('/coupons/')} onNavigate={onNavigate} onBack={onBack} />;
  }

  if (pathname.startsWith('/payment-methods/')) {
    return (
      <PaymentMethodFormPage
        key={pathname}
        methodId={id('/payment-methods/')}
        onNavigate={onNavigate}
        onBack={onBack}
      />
    );
  }

  return <DashboardPage {...list} />;
}
