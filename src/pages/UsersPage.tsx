/**
 * Customers — a port of dristi-admin-app/lib/screens/users_screen.dart.
 *
 * Read-only: the mobile app lists users and never edits them, and neither does
 * this, because the backend exposes no admin user-mutation endpoint.
 */
import { useMemo, useState } from 'react';
import { Copy, MoreHorizontal, NavUsers } from '../components/icons';
import * as api from '../lib/api';
import { money, whenLocal } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../context/AdminContext';
import { PageBody, PageHeader, Toolbar } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, DropdownMenu, MenuItem } from '../components/primitives';
import { SearchInput } from '../components/ui';
import type { AdminUser } from '../types';
import type { PageProps } from './types';

/** The initial disc shown against a customer with no avatar. */
function Avatar({ name, admin }: { name: string; admin: boolean }) {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
      style={{
        color: admin ? 'var(--color-amber)' : 'var(--color-primary)',
        backgroundColor: `color-mix(in srgb, ${admin ? 'var(--color-amber)' : 'var(--color-primary)'} 14%, transparent)`,
      }}
    >
      {name ? name[0].toUpperCase() : '?'}
    </span>
  );
}

export function UsersPage(_: PageProps) {
  const { data, loading, error } = useAsync(() => api.getUsers(), []);
  const [query, setQuery] = useState('');
  const toast = useToast();

  const users = data ?? [];
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast('Email address copied', { success: true });
    } catch {
      toast('Could not copy — check clipboard permissions', { error: true });
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      id: 'name',
      header: 'Customer',
      sortValue: u => u.fullName,
      cell: u => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} admin={u.role === 'admin'} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{u.fullName}</p>
            <p className="truncate text-[12px] text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      secondary: true,
      sortValue: u => u.phone ?? '',
      cell: u => <span className="tnum text-muted-foreground">{u.phone || '—'}</span>,
    },
    {
      id: 'role',
      header: 'Role',
      sortValue: u => u.role,
      cell: u => (
        <Badge color={u.role === 'admin' ? 'var(--color-amber)' : undefined}>{u.role}</Badge>
      ),
    },
    {
      id: 'verified',
      header: 'Verified',
      sortValue: u => (u.isVerified ? 1 : 0),
      cell: u => (
        <Badge
          variant="dot"
          color={u.isVerified ? 'var(--color-success)' : 'var(--color-warning)'}
        >
          {u.isVerified ? 'Verified' : 'Pending'}
        </Badge>
      ),
    },
    {
      id: 'wallet',
      header: 'Wallet',
      align: 'right',
      sortValue: u => u.walletBalance,
      cell: u => <span className="tnum text-foreground">{money(u.walletBalance)}</span>,
    },
    {
      id: 'joined',
      header: 'Joined',
      secondary: true,
      align: 'right',
      sortValue: u => u.createdAt ?? '',
      cell: u => <span className="text-muted-foreground">{whenLocal(u.createdAt) || '—'}</span>,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Customers"
        description={`${users.length} registered account${users.length === 1 ? '' : 's'}.`}
      />

      <Toolbar>
        <SearchInput
          hint="Search by name or email..."
          value={query}
          onChange={setQuery}
          className="w-full sm:w-72"
        />
        {rows.length !== users.length && (
          <span className="text-[12.5px] text-muted-foreground">
            {rows.length} of {users.length} shown
          </span>
        )}
      </Toolbar>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={u => u.id}
        loading={loading}
        initialSort={{ id: 'joined', dir: 'desc' }}
        rowActions={u => (
          <DropdownMenu
            label={`Actions for ${u.fullName}`}
            trigger={
              <span className="grid size-8 place-items-center rounded-lg text-subtle-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
                <MoreHorizontal size={16} />
              </span>
            }
          >
            <MenuItem icon={Copy} onSelect={() => copyEmail(u.email)}>
              Copy email
            </MenuItem>
          </DropdownMenu>
        )}
        empty={{
          icon: NavUsers,
          title: error ? 'Could not load customers' : 'No customers found',
          description: error ?? 'Accounts created in the store will appear here.',
        }}
      />
    </PageBody>
  );
}
