/**
 * Store overview — a port of dristi-admin-app/lib/screens/dashboard_screen.dart.
 *
 * The same five figures and the same Quick Actions, laid out as an asymmetrical
 * bento: revenue takes a double-width, double-height cell because it is the one
 * number a shop owner opens this page for, and the rest fall in around it.
 * Below 768px every span resets and the grid becomes a single column.
 */
import { Clock, NavOrders, NavUsers, Package, Refresh, TrendUpIcon, type Icon } from '../components/icons';
import * as api from '../lib/api';
import { money0 } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { PageBody } from '../components/AdminShell';
import { Reveal, stagger } from '../components/Reveal';
import {
  ActionGrid,
  BrandLoader,
  EmptyBox,
  Eyebrow,
  IconButton,
  PageHeader,
  SectionLabel,
  StatCard,
  StatTile,
} from '../components/ui';
import type { PageProps } from './types';

interface Cell {
  label: string;
  value: string;
  icon: Icon;
  route: string;
  /** The hero cell — double width and height from `md:` up. */
  hero?: boolean;
  /** When set, the cell renders as the quieter dark tile in this tone. */
  accent?: string;
}

export function DashboardPage({ onNavigate, onMenu }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getDashboard(), []);

  const cells: Cell[] = [
    {
      label: 'Revenue',
      value: money0(data?.totalRevenue ?? 0),
      icon: TrendUpIcon,
      route: '/orders',
      hero: true,
    },
    { label: 'Total Orders', value: `${data?.totalOrders ?? 0}`, icon: NavOrders, route: '/orders' },
    { label: 'Total Products', value: `${data?.totalProducts ?? 0}`, icon: Package, route: '/products' },
    {
      label: 'Pending Orders',
      value: `${data?.pendingOrders ?? 0}`,
      icon: Clock,
      route: '/orders',
      accent: 'var(--color-warning)',
    },
    {
      label: 'Total Users',
      value: `${data?.totalUsers ?? 0}`,
      icon: NavUsers,
      route: '/users',
      accent: 'var(--color-teal)',
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Store overview"
        onMenu={onMenu}
        trailing={
          <IconButton label="Refresh" onClick={reload}>
            <Refresh size={16} />
          </IconButton>
        }
      />

      <PageBody>
        {loading ? (
          <BrandLoader />
        ) : error ? (
          <EmptyBox icon={TrendUpIcon} message={error} />
        ) : (
          <>
            {/* A quiet opening line, so the numbers are not the first thing that
                hits — the page has somewhere to start. */}
            <Reveal>
              <div className="mb-10 max-w-xl">
                <Eyebrow>Live</Eyebrow>
                <h2 className="font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.015em] text-ink sm:text-[2.6rem]">
                  Everything your store
                  <span className="block text-accent-soft">is doing right now.</span>
                </h2>
              </div>
            </Reveal>

            {/*
              The bento. `auto-rows-[10rem]` gives the hero something to span two
              of; below md every span resets so no cell is squeezed on a phone.
            */}
            <div className="grid grid-cols-1 gap-4 md:auto-rows-[10rem] md:grid-cols-4">
              {cells.map((cell, i) => (
                <Reveal
                  key={cell.label}
                  delay={stagger(i, 70)}
                  className={cell.hero ? 'md:col-span-2 md:row-span-2' : 'md:col-span-1'}
                >
                  {cell.accent ? (
                    <StatTile
                      label={cell.label}
                      value={cell.value}
                      accent={cell.accent}
                      onClick={() => onNavigate(cell.route)}
                    />
                  ) : (
                    <StatCard
                      label={cell.label}
                      value={cell.value}
                      icon={cell.icon}
                      tall={cell.hero}
                      onClick={() => onNavigate(cell.route)}
                    />
                  )}
                </Reveal>
              ))}
            </div>

            <Reveal>
              <SectionLabel title="Quick actions" eyebrow="Shortcuts" />
            </Reveal>

            <Reveal delay={80}>
              <ActionGrid
                items={[
                  { label: 'Add a product', icon: Package, onClick: () => onNavigate('/products/new') },
                  { label: 'View orders', icon: NavOrders, onClick: () => onNavigate('/orders') },
                  { label: 'Dispatch queue', icon: Clock, onClick: () => onNavigate('/delivery') },
                ]}
              />
            </Reveal>
          </>
        )}
      </PageBody>
    </>
  );
}
