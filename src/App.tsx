/**
 * Router, auth gate and app-level chrome.
 *
 * Routing is hand-rolled HTML5 pushState — the same approach the storefront
 * uses, so there is no router dependency and real paths work. Routes mirror the
 * Flutter app's named routes, with each form screen's `arguments: id` becoming
 * a path segment (/products/:id, /products/new).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminProvider, useAuth } from './context/AdminContext';
import { AdminShell } from './components/AdminShell';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
import { breadcrumbFor, sectionFor } from './components/navigation';
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
  const command = useCommandPalette();

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
    if (window.history.length > 1) window.history.back();
    else navigate(sectionFor(window.location.pathname)?.route ?? HOME);
  }, [navigate]);

  // Signing out must not leave a stale admin path in the address bar, and
  // signing in should land on the dashboard.
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

  const breadcrumb = useMemo(() => {
    const isNew = pathname.endsWith('/new');
    const isLeaf = sectionFor(pathname) && pathname !== sectionFor(pathname)?.route;
    return breadcrumbFor(pathname, isNew ? 'New' : isLeaf ? 'Edit' : undefined);
  }, [pathname]);

  if (!ready) return <BrandLoader label="Dristi Fashions" />;
  if (!isAuthenticated) return <LoginPage />;

  return (
    <>
      <AdminShell
        currentRoute={sectionFor(pathname)?.route ?? HOME}
        breadcrumb={breadcrumb}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
        onOpenDrawer={() => setDrawerOpen(true)}
        onNavigate={navigate}
        onOpenCommand={() => command.setOpen(true)}
      >
        {renderPage(pathname, navigate, goBack)}
      </AdminShell>

      <CommandPalette
        open={command.open}
        onClose={() => command.setOpen(false)}
        onNavigate={navigate}
      />
    </>
  );
}

function renderPage(pathname: string, onNavigate: (path: string) => void, onBack: () => void) {
  const page = { onNavigate };

  switch (pathname) {
    case '/':
    case '/dashboard':
      return <DashboardPage {...page} />;
    case '/users':
      return <UsersPage {...page} />;
    case '/products':
      return <ProductsPage {...page} />;
    case '/orders':
      return <OrdersPage {...page} />;
    case '/categories':
      return <CategoriesPage {...page} />;
    case '/banners':
      return <BannersPage {...page} />;
    case '/coupons':
      return <CouponsPage {...page} />;
    case '/payment-methods':
      return <PaymentMethodsPage {...page} />;
    case '/delivery':
      return <DeliveryPage {...page} />;
    case '/returns':
      return <ReturnsPage {...page} />;
    case '/delivery-settings':
      return <DeliverySettingsPage {...page} />;
    case '/referrals':
      return <ReferralsPage {...page} />;
    case '/messages':
      return <MessagesPage {...page} />;
    default:
      break;
  }

  // Dynamic segments. `new` means a create form; anything else is a record id.
  // Keying on the path remounts the page between two records, resetting state.
  const idFrom = (prefix: string): string | null => {
    const rest = pathname.slice(prefix.length);
    return rest === 'new' ? null : rest;
  };

  if (pathname.startsWith('/products/')) {
    return <ProductFormPage key={pathname} productId={idFrom('/products/')} onNavigate={onNavigate} onBack={onBack} />;
  }
  if (pathname.startsWith('/orders/')) {
    return (
      <OrderDetailPage key={pathname} orderId={pathname.slice('/orders/'.length)} onNavigate={onNavigate} onBack={onBack} />
    );
  }
  if (pathname.startsWith('/categories/')) {
    return <CategoryFormPage key={pathname} categoryId={idFrom('/categories/')} onNavigate={onNavigate} onBack={onBack} />;
  }
  if (pathname.startsWith('/banners/')) {
    return <BannerFormPage key={pathname} bannerId={idFrom('/banners/')} onNavigate={onNavigate} onBack={onBack} />;
  }
  if (pathname.startsWith('/coupons/')) {
    return <CouponFormPage key={pathname} couponId={idFrom('/coupons/')} onNavigate={onNavigate} onBack={onBack} />;
  }
  if (pathname.startsWith('/payment-methods/')) {
    return (
      <PaymentMethodFormPage
        key={pathname}
        methodId={idFrom('/payment-methods/')}
        onNavigate={onNavigate}
        onBack={onBack}
      />
    );
  }

  return <DashboardPage {...page} />;
}
