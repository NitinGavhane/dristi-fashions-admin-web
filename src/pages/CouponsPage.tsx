/**
 * Discount codes — a port of dristi-admin-app/lib/screens/coupons_screen.dart.
 */
import { useMemo, useState } from 'react';
import { Copy, Gift, MoreHorizontal, Pencil, Plus, Trash } from '../components/icons';
import * as api from '../lib/api';
import { money } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { errorMessage } from '../lib/apiClient';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody, PageHeader, Toolbar } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, Button, DropdownMenu, MenuItem } from '../components/primitives';
import { SearchInput } from '../components/ui';
import type { AdminCoupon } from '../types';
import type { PageProps } from './types';

export function CouponsPage({ onNavigate }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getCoupons(), []);
  const [query, setQuery] = useState('');
  const confirm = useConfirm();
  const toast = useToast();

  const coupons = data ?? [];
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter(c => c.code.toLowerCase().includes(q));
  }, [coupons, query]);

  const remove = async (coupon: AdminCoupon) => {
    const ok = await confirm({ message: `Remove "${coupon.code}"?` });
    if (!ok) return;
    try {
      await api.deleteCoupon(coupon.id);
      toast('Coupon removed', { success: true });
      reload();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast(`"${code}" copied`, { success: true });
    } catch {
      toast('Could not copy — check clipboard permissions', { error: true });
    }
  };

  const columns: Column<AdminCoupon>[] = [
    {
      id: 'code',
      header: 'Code',
      sortValue: c => c.code,
      cell: c => <span className="font-mono text-[13px] font-medium tracking-wide text-foreground">{c.code}</span>,
    },
    {
      id: 'value',
      header: 'Discount',
      sortValue: c => c.value,
      cell: c => (
        <span className="tnum text-foreground">
          {c.type === 'percentage' ? `${c.value.toFixed(0)}%` : money(c.value)}
          <span className="ml-1.5 text-[12px] text-subtle-foreground">off</span>
        </span>
      ),
    },
    {
      id: 'minOrder',
      header: 'Min order',
      align: 'right',
      secondary: true,
      sortValue: c => c.minOrderAmount ?? 0,
      cell: c => (
        <span className="tnum text-muted-foreground">
          {c.minOrderAmount != null ? money(c.minOrderAmount) : '—'}
        </span>
      ),
    },
    {
      id: 'usage',
      header: 'Used',
      align: 'right',
      sortValue: c => c.usedCount / Math.max(1, c.usageLimit),
      cell: c => {
        const exhausted = c.usedCount >= c.usageLimit;
        return (
          <span
            className="tnum"
            style={{ color: exhausted ? 'var(--color-warning)' : 'var(--color-muted-foreground)' }}
          >
            {c.usedCount} / {c.usageLimit}
          </span>
        );
      },
    },
    {
      id: 'expiry',
      header: 'Expires',
      secondary: true,
      sortValue: c => c.expiryDate ?? '',
      cell: c => (
        <span className="text-muted-foreground">
          {c.expiryDate ? c.expiryDate.slice(0, 10) : 'No expiry'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: c => (c.isActive ? 'active' : 'inactive'),
      cell: c => (
        <Badge variant="dot" color={c.isActive ? 'var(--color-success)' : 'var(--color-subtle-foreground)'}>
          {c.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Coupons"
        description={`${coupons.filter(c => c.isActive).length} of ${coupons.length} currently active.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => onNavigate('/coupons/new')}>
            New coupon
          </Button>
        }
      />

      <Toolbar>
        <SearchInput hint="Search by code..." value={query} onChange={setQuery} className="w-full sm:w-64" />
      </Toolbar>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={c => c.id}
        loading={loading}
        onRowClick={c => onNavigate(`/coupons/${c.id}`)}
        initialSort={{ id: 'code', dir: 'asc' }}
        rowActions={c => (
          <DropdownMenu
            label={`Actions for ${c.code}`}
            trigger={
              <span className="grid size-8 place-items-center rounded-lg text-subtle-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
                <MoreHorizontal size={16} />
              </span>
            }
          >
            <MenuItem icon={Copy} onSelect={() => copyCode(c.code)}>
              Copy code
            </MenuItem>
            <MenuItem icon={Pencil} onSelect={() => onNavigate(`/coupons/${c.id}`)}>
              Edit
            </MenuItem>
            <MenuItem icon={Trash} destructive onSelect={() => remove(c)}>
              Delete
            </MenuItem>
          </DropdownMenu>
        )}
        empty={{
          icon: Gift,
          title: error ? 'Could not load coupons' : 'No coupons yet',
          description: error ?? 'Create a discount code to run your first promotion.',
          action: error ? undefined : (
            <Button variant="primary" icon={Plus} onClick={() => onNavigate('/coupons/new')}>
              New coupon
            </Button>
          ),
        }}
      />
    </PageBody>
  );
}
