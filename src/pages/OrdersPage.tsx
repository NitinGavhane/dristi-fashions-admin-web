/**
 * Orders — a port of dristi-admin-app/lib/screens/orders_screen.dart, rebuilt
 * as a data table with a status filter.
 */
import { useMemo, useState } from 'react';
import { ChevronRight, NavOrders } from '../components/icons';
import * as api from '../lib/api';
import { money, orderStatusColor, orderStatusLabel, paymentStatusColor, whenLocal } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { PageBody, PageHeader, Toolbar } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/primitives';
import { FilterChips, SearchInput } from '../components/ui';
import type { AdminOrder } from '../types';
import type { PageProps } from './types';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'placed', label: 'Placed' },
  { value: 'processing', label: 'Processing' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function OrdersPage({ onNavigate }: PageProps) {
  const { data, loading, error } = useAsync(() => api.getOrders(), []);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');

  const orders = data ?? [];
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(o => {
      if (status && o.orderStatus !== status) return false;
      if (q && !o.orderNumber.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, status, query]);

  const columns: Column<AdminOrder>[] = [
    {
      id: 'orderNumber',
      header: 'Order',
      sortValue: o => o.orderNumber,
      cell: o => <span className="font-mono text-[12.5px] font-medium text-foreground">#{o.orderNumber}</span>,
    },
    {
      id: 'createdAt',
      header: 'Placed',
      secondary: true,
      sortValue: o => o.createdAt ?? '',
      cell: o => <span className="text-muted-foreground">{whenLocal(o.createdAt) || '—'}</span>,
    },
    {
      id: 'items',
      header: 'Items',
      align: 'right',
      secondary: true,
      sortValue: o => o.items.reduce((n, i) => n + i.quantity, 0),
      cell: o => (
        <span className="tnum text-muted-foreground">{o.items.reduce((n, i) => n + i.quantity, 0)}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: o => o.orderStatus,
      cell: o => (
        <Badge variant="dot" color={orderStatusColor(o.orderStatus)}>
          {orderStatusLabel(o.orderStatus)}
        </Badge>
      ),
    },
    {
      id: 'payment',
      header: 'Payment',
      sortValue: o => o.paymentStatus,
      cell: o => <Badge color={paymentStatusColor(o.paymentStatus)}>{o.paymentStatus.toUpperCase()}</Badge>,
    },
    {
      id: 'total',
      header: 'Total',
      align: 'right',
      sortValue: o => o.finalAmount,
      cell: o => <span className="tnum font-medium text-foreground">{money(o.finalAmount)}</span>,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Orders"
        description={`${orders.length} order${orders.length === 1 ? '' : 's'} placed.`}
      />

      <Toolbar>
        <SearchInput
          hint="Search by order number..."
          value={query}
          onChange={setQuery}
          className="w-full sm:w-64"
        />
        <FilterChips options={STATUS_FILTERS} active={status} onSelect={setStatus} />
      </Toolbar>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={o => o.id}
        loading={loading}
        onRowClick={o => onNavigate(`/orders/${o.id}`)}
        initialSort={{ id: 'createdAt', dir: 'desc' }}
        rowActions={() => (
          <span className="grid size-8 place-items-center rounded-lg text-subtle-foreground">
            <ChevronRight size={15} />
          </span>
        )}
        empty={{
          icon: NavOrders,
          title: error ? 'Could not load orders' : status || query ? 'No matching orders' : 'No orders yet',
          description: error ?? 'Orders placed in the store will appear here.',
        }}
      />
    </PageBody>
  );
}
