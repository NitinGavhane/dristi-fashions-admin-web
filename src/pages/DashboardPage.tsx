/**
 * Store overview — a port of dristi-admin-app/lib/screens/dashboard_screen.dart.
 * Five stat tiles (each a shortcut to its list) and the Quick Actions grid.
 */
import { Clock, PackagePlus, Package, ReceiptText, RefreshCw, TrendingUp, Users } from 'lucide-react';
import * as api from '../lib/api';
import { money0 } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { PageBody } from '../components/AdminShell';
import { ActionGrid, BrandLoader, EmptyBox, IconBox, PageHeader, SectionLabel, StatCard } from '../components/ui';
import type { PageProps } from './types';

export function DashboardPage({ onNavigate, onMenu }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getDashboard(), []);

  const stats = [
    { label: 'Total Users', value: `${data?.totalUsers ?? 0}`, icon: Users, route: '/users' },
    { label: 'Total Products', value: `${data?.totalProducts ?? 0}`, icon: Package, route: '/products' },
    { label: 'Total Orders', value: `${data?.totalOrders ?? 0}`, icon: ReceiptText, route: '/orders' },
    { label: 'Revenue', value: money0(data?.totalRevenue ?? 0), icon: TrendingUp, route: '/orders' },
    { label: 'Pending Orders', value: `${data?.pendingOrders ?? 0}`, icon: Clock, route: '/orders' },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="STORE OVERVIEW"
        onMenu={onMenu}
        trailing={
          <IconBox label="Refresh" onClick={reload}>
            <RefreshCw size={16} />
          </IconBox>
        }
      />
      <PageBody>
        {loading ? (
          <BrandLoader />
        ) : error ? (
          <EmptyBox icon={TrendingUp} message={error} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {stats.map(s => (
                <StatCard
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  icon={s.icon}
                  onClick={() => onNavigate(s.route)}
                />
              ))}
            </div>

            <SectionLabel title="Quick Actions" />
            <ActionGrid
              items={[
                { label: 'Add Product', icon: PackagePlus, onClick: () => onNavigate('/products/new') },
                { label: 'View Orders', icon: ReceiptText, onClick: () => onNavigate('/orders') },
              ]}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
