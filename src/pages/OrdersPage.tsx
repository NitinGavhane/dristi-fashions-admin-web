/**
 * All orders — a port of dristi-admin-app/lib/screens/orders_screen.dart.
 * Each row opens the detail page, where the status can be changed.
 */
import { ChevronRight, Receipt, ReceiptText } from 'lucide-react';
import * as api from '../lib/api';
import { money, orderStatusColor, orderStatusLabel, paymentStatusColor } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { PageBody } from '../components/AdminShell';
import { BrandLoader, EmptyBox, ListCard, PageHeader, Tag } from '../components/ui';
import type { PageProps } from './types';

export function OrdersPage({ onNavigate, onMenu }: PageProps) {
  const { data, loading, error } = useAsync(() => api.getOrders(), []);
  const orders = data ?? [];

  return (
    <>
      <PageHeader title="Orders" subtitle={`${orders.length} TOTAL`} onMenu={onMenu} />
      <PageBody>
        <div className="space-y-2.5">
          {loading ? (
            <BrandLoader />
          ) : error ? (
            <EmptyBox icon={ReceiptText} message={error} />
          ) : orders.length === 0 ? (
            <EmptyBox icon={ReceiptText} message="No orders" />
          ) : (
            orders.map(o => {
              const accent = orderStatusColor(o.orderStatus);
              return (
                <ListCard key={o.id} onClick={() => onNavigate(`/orders/${o.id}`)}>
                  <div className="flex items-center gap-3.5">
                    <span
                      className="grid size-12 shrink-0 place-items-center rounded-input border"
                      style={{
                        color: accent,
                        borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
                        backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
                      }}
                    >
                      <Receipt size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold tracking-[0.5px] text-ink">#{o.orderNumber}</p>
                      <p className="mt-1 text-base font-black text-coral">{money(o.finalAmount)}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Tag text={orderStatusLabel(o.orderStatus)} color={accent} />
                        <Tag text={o.paymentStatus.toUpperCase()} color={paymentStatusColor(o.paymentStatus)} />
                      </div>
                    </div>
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-md border"
                      style={{
                        color: accent,
                        borderColor: `color-mix(in srgb, ${accent} 15%, transparent)`,
                        backgroundColor: `color-mix(in srgb, ${accent} 8%, transparent)`,
                      }}
                    >
                      <ChevronRight size={18} />
                    </span>
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
