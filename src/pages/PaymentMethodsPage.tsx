/**
 * Checkout payment methods — a port of
 * dristi-admin-app/lib/screens/payment_methods_screen.dart.
 */
import { Plus, Wallet } from 'lucide-react';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { useAsync } from '../lib/useAsync';
import { regionsLabel } from '../types';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import { BrandLoader, DeleteButton, EditButton, EmptyBox, FloatingAction, PageHeader } from '../components/ui';
import type { PageProps } from './types';

export function PaymentMethodsPage({ onNavigate, onMenu }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getPaymentMethods(), []);
  const confirm = useConfirm();
  const toast = useToast();
  const methods = data ?? [];

  const remove = async (id: string, name: string) => {
    const ok = await confirm({
      message: `Remove "${name}" from checkout? To hide it temporarily, switch it to inactive instead.`,
    });
    if (!ok) return;
    try {
      await api.deletePaymentMethod(id);
      toast('Payment method removed', { success: true });
      reload();
    } catch (e) {
      toast(`Delete failed: ${errorMessage(e)}`, { error: true });
    }
  };

  const activeCount = methods.filter(m => m.isActive).length;

  return (
    <>
      <PageHeader
        title="Payment Methods"
        subtitle={`${activeCount} ACTIVE · ${methods.length} TOTAL`}
        onMenu={onMenu}
      />
      <PageBody>
        <div className="space-y-3">
          {loading ? (
            <BrandLoader />
          ) : error ? (
            <EmptyBox icon={Wallet} message={error} />
          ) : methods.length === 0 ? (
            <EmptyBox icon={Wallet} message="No payment methods yet — use + to add one" />
          ) : (
            methods.map(m => (
              <div
                key={m.id}
                className="card-surface flex items-center gap-2 rounded-2xl border p-3.5 shadow-md-soft"
                style={{
                  borderColor: m.isActive
                    ? 'color-mix(in srgb, var(--color-coral) 25%, transparent)'
                    : 'var(--color-hair-light)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink">{m.name}</p>
                    <span className="rounded bg-bg-alt px-1.5 py-0.5 text-[9px] font-bold tracking-[1px] text-muted">
                      {m.code.toUpperCase()}
                    </span>
                  </div>
                  {m.description && <p className="mt-1 text-[11px] text-ink-soft">{m.description}</p>}
                  <span
                    className="mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      color: m.isActive ? 'var(--color-muted)' : 'var(--color-error)',
                      backgroundColor: m.isActive
                        ? 'var(--color-bg-alt)'
                        : 'color-mix(in srgb, var(--color-error) 8%, transparent)',
                    }}
                  >
                    {regionsLabel(m.regions)} · VIA {m.gateway.toUpperCase()} · ORDER {m.sortOrder}
                    {!m.isActive && ' · INACTIVE'}
                  </span>
                </div>
                <EditButton onClick={() => onNavigate(`/payment-methods/${m.id}`)} label={`Edit ${m.name}`} />
                <DeleteButton onClick={() => remove(m.id, m.name)} label={`Delete ${m.name}`} />
              </div>
            ))
          )}
        </div>
      </PageBody>
      <FloatingAction onClick={() => onNavigate('/payment-methods/new')} label="Add payment method" icon={Plus} />
    </>
  );
}
