/**
 * Store overview — the five figures from
 * dristi-admin-app/lib/screens/dashboard_screen.dart, laid out for a desk.
 *
 * Metric cards sit in a row rather than a bento of oversized plates: five
 * numbers a shop owner scans in one pass, then the shortcuts underneath.
 */
import {
  ArrowUpRight,
  Clock,
  NavOrders,
  NavUsers,
  Package,
  Plus,
  Refresh,
  TrendUpIcon,
  Truck,
  type Icon,
} from '../components/icons';
import * as api from '../lib/api';
import { money0 } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { PageBody, PageHeader } from '../components/AdminShell';
import { Reveal, stagger } from '../components/Reveal';
import {
  Button,
  Card,
  EmptyState,
  SectionHeading,
  Skeleton,
  cx,
} from '../components/primitives';
import type { PageProps } from './types';

interface Metric {
  label: string;
  value: string;
  icon: Icon;
  route: string;
  tone?: string;
}

export function DashboardPage({ onNavigate }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getDashboard(), []);

  const metrics: Metric[] = [
    {
      label: 'Revenue',
      value: money0(data?.totalRevenue ?? 0),
      icon: TrendUpIcon,
      route: '/orders',
      tone: 'var(--color-primary)',
    },
    { label: 'Orders', value: `${data?.totalOrders ?? 0}`, icon: NavOrders, route: '/orders' },
    {
      label: 'Pending orders',
      value: `${data?.pendingOrders ?? 0}`,
      icon: Clock,
      route: '/orders',
      tone: 'var(--color-warning)',
    },
    { label: 'Products', value: `${data?.totalProducts ?? 0}`, icon: Package, route: '/products' },
    { label: 'Customers', value: `${data?.totalUsers ?? 0}`, icon: NavUsers, route: '/users' },
  ];

  const shortcuts = [
    { label: 'Add a product', description: 'Create a new catalogue item', icon: Plus, route: '/products/new' },
    { label: 'Dispatch queue', description: 'Orders waiting to go out', icon: Truck, route: '/delivery' },
    { label: 'All orders', description: 'Review and update statuses', icon: NavOrders, route: '/orders' },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Dashboard"
        description="Everything your store is doing right now."
        actions={
          <Button variant="outline" icon={Refresh} onClick={reload}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card>
          <EmptyState icon={TrendUpIcon} title="Could not load the dashboard" description={error} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {metrics.map((metric, i) => (
              <Reveal key={metric.label} delay={stagger(i, 50)}>
                <MetricCard metric={metric} loading={loading} onClick={() => onNavigate(metric.route)} />
              </Reveal>
            ))}
          </div>

          <div className="mt-10">
            <SectionHeading title="Shortcuts" description="The things you reach for most." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shortcuts.map((shortcut, i) => (
                <Reveal key={shortcut.label} delay={stagger(i, 60)}>
                  <button
                    type="button"
                    onClick={() => onNavigate(shortcut.route)}
                    className="elevated group flex w-full items-center gap-3.5 rounded-xl p-4 text-left transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border-strong hover:bg-hover"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card-raised text-primary">
                      <shortcut.icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-foreground">
                        {shortcut.label}
                      </span>
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {shortcut.description}
                      </span>
                    </span>
                    <span className="shrink-0 text-subtle-foreground transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground">
                      <ArrowUpRight size={15} />
                    </span>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </>
      )}
    </PageBody>
  );
}

function MetricCard({
  metric,
  loading,
  onClick,
}: {
  metric: Metric;
  loading: boolean;
  onClick: () => void;
}) {
  const tone = metric.tone ?? 'var(--color-muted-foreground)';
  return (
    <button
      type="button"
      onClick={onClick}
      className="elevated group relative w-full overflow-hidden rounded-xl p-4 text-left transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border-strong hover:bg-hover"
    >
      <div className="flex items-center justify-between">
        <span className="grid size-8 place-items-center rounded-lg" style={{ color: tone, backgroundColor: `color-mix(in srgb, ${tone} 12%, transparent)` }}>
          <metric.icon size={15} />
        </span>
        <span className="text-subtle-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <ArrowUpRight size={14} />
        </span>
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-7 w-20" />
      ) : (
        <p
          className={cx('tnum mt-4 font-display text-[1.75rem] font-semibold leading-none tracking-[-0.02em]')}
          style={{ color: metric.tone ? tone : 'var(--color-foreground)' }}
        >
          {metric.value}
        </p>
      )}
      <p className="mt-1.5 text-[12px] font-medium text-muted-foreground">{metric.label}</p>
    </button>
  );
}
