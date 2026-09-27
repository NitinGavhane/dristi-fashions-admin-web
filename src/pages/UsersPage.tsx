/**
 * Registered customers — a port of dristi-admin-app/lib/screens/users_screen.dart.
 * Read-only: the mobile app lists users and never edits them, and neither does
 * this, because the backend exposes no admin user-mutation endpoint.
 */
import { useMemo, useState } from 'react';
import { NavUsers } from '../components/icons';
import * as api from '../lib/api';
import { money0 } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { PageBody } from '../components/AdminShell';
import { BrandLoader, EmptyBox, ListCard, PageHeader, SearchInput, Tag } from '../components/ui';
import type { PageProps } from './types';

/** The short reference the mobile app prints under each name. */
const shortRef = (id: string) =>
  `P-${(id.length > 6 ? id.slice(-6) : id).toUpperCase()}`;

export function UsersPage({ onMenu }: PageProps) {
  const { data, loading, error } = useAsync(() => api.getUsers(), []);
  const [query, setQuery] = useState('');

  const users = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <>
      <PageHeader title="Users" subtitle={`${users.length} registered`} onMenu={onMenu} />
      <PageBody>
        <SearchInput hint="Search users by name or email" value={query} onChange={setQuery} />

        <div className="mt-3 space-y-2">
          {loading ? (
            <BrandLoader />
          ) : error ? (
            <EmptyBox icon={NavUsers} message={error} />
          ) : filtered.length === 0 ? (
            <EmptyBox icon={NavUsers} message="No users found" />
          ) : (
            filtered.map(u => {
              const isAdmin = u.role === 'admin';
              return (
                <ListCard key={u.id}>
                  <div className="flex items-start gap-3.5">
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-black text-white ${
                        isAdmin ? 'bg-accent shadow-violet' : 'plate-accent border border-accent/40 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.85)]'
                      }`}
                    >
                      {u.fullName ? u.fullName[0].toUpperCase() : '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{u.fullName}</p>
                      <p className="truncate text-xs text-ink-soft">{u.email}</p>
                      <p className="mt-0.5 text-[10px] font-semibold tracking-[0.5px] text-muted">{shortRef(u.id)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Tag text={u.role} color={isAdmin ? 'var(--color-amber)' : 'var(--color-accent)'} filled />
                        <Tag
                          text={u.isVerified ? 'Verified' : 'Unverified'}
                          color={u.isVerified ? 'var(--color-success)' : 'var(--color-warning)'}
                        />
                        <Tag text={money0(u.walletBalance)} color="var(--color-teal)" />
                      </div>
                    </div>
                  </div>
                </ListCard>
              );
            })
          )}
        </div>
      </PageBody>
    </>
  );
}
