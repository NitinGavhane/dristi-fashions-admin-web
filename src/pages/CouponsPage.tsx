/**
 * Discount codes — a port of dristi-admin-app/lib/screens/coupons_screen.dart.
 */
import { Gift, Plus } from 'lucide-react';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { money } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import { BrandLoader, DeleteButton, EditButton, EmptyBox, FloatingAction, ListCard, PageHeader } from '../components/ui';
import type { PageProps } from './types';

export function CouponsPage({ onNavigate, onMenu }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getCoupons(), []);
  const confirm = useConfirm();
  const toast = useToast();
  const coupons = data ?? [];

  const remove = async (id: string, code: string) => {
    const ok = await confirm({ message: `Remove "${code}"?` });
    if (!ok) return;
    try {
      await api.deleteCoupon(id);
      toast('Coupon removed', { success: true });
      reload();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    }
  };

  return (
    <>
      <PageHeader title="Coupons" subtitle={`${coupons.length} ACTIVE`} onMenu={onMenu} />
      <PageBody>
        <div className="space-y-2.5">
          {loading ? (
            <BrandLoader />
          ) : error ? (
            <EmptyBox icon={Gift} message={error} />
          ) : coupons.length === 0 ? (
            <EmptyBox icon={Gift} message="No coupons" />
          ) : (
            coupons.map(c => (
              <ListCard key={c.id}>
                <div className="flex items-center gap-3.5">
                  <span
                    className={`grid size-[52px] shrink-0 place-items-center rounded-input text-base font-black tracking-[1px] text-white ${
                      c.isActive
                        ? 'bg-gradient-to-br from-coral to-coral-80 shadow-violet'
                        : 'bg-gradient-to-br from-muted to-hair-light'
                    }`}
                  >
                    {c.code.slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold tracking-[1px] text-ink">{c.code}</p>
                    <span className="mt-1 inline-block rounded bg-coral/[0.08] px-1.5 py-0.5 text-[11px] font-semibold text-coral">
                      {c.type.toUpperCase()} ·{' '}
                      {c.type === 'percentage' ? `${c.value.toFixed(0)}%` : money(c.value)} OFF
                    </span>
                    <p className="mt-1 text-[11px] text-muted">
                      Used {c.usedCount}/{c.usageLimit}
                      {!c.isActive && ' · INACTIVE'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <EditButton onClick={() => onNavigate(`/coupons/${c.id}`)} label={`Edit ${c.code}`} />
                    <DeleteButton onClick={() => remove(c.id, c.code)} label={`Delete ${c.code}`} />
                  </div>
                </div>
              </ListCard>
            ))
          )}
        </div>
      </PageBody>
      <FloatingAction onClick={() => onNavigate('/coupons/new')} label="Add coupon" icon={Plus} />
    </>
  );
}
