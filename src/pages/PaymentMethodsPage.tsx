/**
 * Checkout payment methods — a port of
 * dristi-admin-app/lib/screens/payment_methods_screen.dart.
 *
 * Sorted by `sortOrder` by default, because that is the order buyers see at
 * checkout — the list should read the way the checkout reads.
 */
import { MoreHorizontal, Pencil, Plus, Trash, Wallet } from '../components/icons';
import * as api from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { errorMessage } from '../lib/apiClient';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody, PageHeader } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, Button, DropdownMenu, MenuItem } from '../components/primitives';
import { regionsLabel, type AdminPaymentMethod } from '../types';
import type { PageProps } from './types';

export function PaymentMethodsPage({ onNavigate }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getPaymentMethods(), []);
  const confirm = useConfirm();
  const toast = useToast();

  const methods = data ?? [];

  const remove = async (method: AdminPaymentMethod) => {
    const ok = await confirm({
      message: `Remove "${method.name}" from checkout? To hide it temporarily, switch it to inactive instead.`,
    });
    if (!ok) return;
    try {
      await api.deletePaymentMethod(method.id);
      toast('Payment method removed', { success: true });
      reload();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    }
  };

  const columns: Column<AdminPaymentMethod>[] = [
    {
      id: 'sortOrder',
      header: '#',
      width: 'w-14',
      align: 'center',
      sortValue: m => m.sortOrder,
      cell: m => <span className="tnum text-subtle-foreground">{m.sortOrder}</span>,
    },
    {
      id: 'name',
      header: 'Method',
      sortValue: m => m.name,
      cell: m => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{m.name}</p>
          {m.description && <p className="truncate text-[12px] text-muted-foreground">{m.description}</p>}
        </div>
      ),
    },
    {
      id: 'code',
      header: 'Code',
      sortValue: m => m.code,
      cell: m => <span className="font-mono text-[12.5px] text-muted-foreground">{m.code}</span>,
    },
    {
      id: 'gateway',
      header: 'Gateway',
      secondary: true,
      sortValue: m => m.gateway,
      cell: m => <Badge>{m.gateway}</Badge>,
    },
    {
      id: 'regions',
      header: 'Regions',
      secondary: true,
      sortValue: m => m.regions,
      cell: m => <span className="text-[12.5px] text-muted-foreground">{regionsLabel(m.regions)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: m => (m.isActive ? 'active' : 'inactive'),
      cell: m => (
        <Badge variant="dot" color={m.isActive ? 'var(--color-success)' : 'var(--color-subtle-foreground)'}>
          {m.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Payment methods"
        description={`${methods.filter(m => m.isActive).length} of ${methods.length} offered at checkout.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => onNavigate('/payment-methods/new')}>
            New method
          </Button>
        }
      />

      <DataTable
        rows={methods}
        columns={columns}
        rowKey={m => m.id}
        loading={loading}
        onRowClick={m => onNavigate(`/payment-methods/${m.id}`)}
        initialSort={{ id: 'sortOrder', dir: 'asc' }}
        pageSize={0}
        rowActions={m => (
          <DropdownMenu
            label={`Actions for ${m.name}`}
            trigger={
              <span className="grid size-8 place-items-center rounded-lg text-subtle-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
                <MoreHorizontal size={16} />
              </span>
            }
          >
            <MenuItem icon={Pencil} onSelect={() => onNavigate(`/payment-methods/${m.id}`)}>
              Edit
            </MenuItem>
            <MenuItem icon={Trash} destructive onSelect={() => remove(m)}>
              Delete
            </MenuItem>
          </DropdownMenu>
        )}
        empty={{
          icon: Wallet,
          title: error ? 'Could not load payment methods' : 'No payment methods yet',
          description: error ?? 'Add the methods you want offered at checkout.',
          action: error ? undefined : (
            <Button variant="primary" icon={Plus} onClick={() => onNavigate('/payment-methods/new')}>
              New method
            </Button>
          ),
        }}
      />
    </PageBody>
  );
}
