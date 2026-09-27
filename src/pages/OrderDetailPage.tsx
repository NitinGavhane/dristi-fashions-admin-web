/**
 * One order, and the status controls — a port of
 * dristi-admin-app/lib/screens/order_detail_screen.dart.
 *
 * There is no single-order admin endpoint, so this fetches the admin order list
 * and picks the row out of it, exactly as the Flutter screen does.
 */
import { useCallback, useState } from 'react';
import { SearchX, ShoppingBag } from 'lucide-react';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { money, orderStatusColor, orderStatusLabel } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { ORDER_STATUSES } from '../types';
import { useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  Card,
  DividerLine,
  EmptyBox,
  InfoBlock,
  ListCard,
  PageHeader,
  SectionLabel,
  Tag,
} from '../components/ui';
import type { DetailPageProps } from './types';

export function OrderDetailPage({ orderId, onBack }: DetailPageProps & { orderId: string }) {
  const toast = useToast();
  const [updating, setUpdating] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    const orders = await api.getOrders();
    return orders.find(o => o.id === orderId) ?? null;
  }, [orderId]);

  const { data: order, loading, error, reload } = useAsync(fetch, [orderId]);

  const setStatus = async (status: string) => {
    if (!order) return;
    setUpdating(status);
    try {
      await api.updateOrderStatus(order.id, status);
      toast(`Order marked ${orderStatusLabel(status).toLowerCase()}`, { success: true });
      reload();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Order" onBack={onBack} />
        <BrandLoader />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <PageHeader title="Order" onBack={onBack} />
        <PageBody>
          <EmptyBox icon={SearchX} message={error ?? 'Not found'} />
        </PageBody>
      </>
    );
  }

  const accent = orderStatusColor(order.orderStatus);

  return (
    <>
      <PageHeader title="Order" subtitle={`#${order.orderNumber}`} onBack={onBack} />
      <PageBody>
        <Card accentColor={accent}>
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 truncate text-lg font-black tracking-[1px] text-ink">
              #{order.orderNumber}
            </h2>
            <Tag text={orderStatusLabel(order.orderStatus)} color={accent} />
          </div>
          <DividerLine />
          <InfoBlock label="Payment" value={order.paymentStatus.toUpperCase()} />
          <InfoBlock label="Subtotal" value={money(order.subtotal)} />
          <InfoBlock label="GST" value={money(order.gstAmount)} />
          {order.discountAmount > 0 && (
            <InfoBlock
              label="Discount"
              value={`-${money(order.discountAmount)}`}
              valueColor="var(--color-success)"
            />
          )}
          <DividerLine />
          <InfoBlock label="Total" value={money(order.finalAmount)} valueColor="var(--color-coral)" />
          {order.shippingAddress && <InfoBlock label="Address" value={order.shippingAddress} />}
        </Card>

        <SectionLabel title="Items" />
        <div className="space-y-2">
          {order.items.length === 0 ? (
            <EmptyBox icon={ShoppingBag} message="No items on this order" />
          ) : (
            order.items.map(item => (
              <ListCard key={item.id} className="!p-3.5">
                <div className="flex items-center gap-3.5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-hair bg-bg-alt text-muted">
                    <ShoppingBag size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{item.productName}</p>
                    <p className="text-[11px] text-muted">Qty: {item.quantity}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-coral/20 bg-coral/[0.08] px-2.5 py-1.5 text-[13px] font-extrabold text-coral">
                    {money(item.price * item.quantity)}
                  </span>
                </div>
              </ListCard>
            ))
          )}
        </div>

        <SectionLabel title="Update Status" />
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map(s => {
            const current = s === order.orderStatus;
            return (
              <button
                key={s}
                type="button"
                disabled={current || updating !== null}
                onClick={() => setStatus(s)}
                aria-current={current ? 'true' : undefined}
                className={`label-caps rounded-lg border px-4 py-3 text-[10px] tracking-[1.5px] transition disabled:cursor-default ${
                  current
                    ? 'border-coral-dark/35 bg-btn font-extrabold text-white shadow-violet'
                    : 'border-btn-border bg-gradient-to-br from-btn-40 to-white font-bold text-btn hover:brightness-105 disabled:opacity-60'
                }`}
              >
                {orderStatusLabel(s)}
              </button>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
