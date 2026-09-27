/**
 * One order, and its status controls — a port of
 * dristi-admin-app/lib/screens/order_detail_screen.dart.
 *
 * There is no single-order admin endpoint, so this fetches the admin order list
 * and picks the row out of it, exactly as the Flutter screen does.
 */
import { useCallback, useState } from 'react';
import { ArrowLeft, ReceiptCancelled, ShoppingBag } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { money, orderStatusColor, orderStatusLabel, paymentStatusColor, whenLocal } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { ORDER_STATUSES } from '../types';
import { useToast } from '../context/AdminContext';
import { FormBody, PageHeader } from '../components/AdminShell';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Separator,
  cx,
} from '../components/primitives';
import { BrandLoader } from '../components/ui';
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

  if (loading) return <BrandLoader />;

  if (error || !order) {
    return (
      <FormBody>
        <PageHeader
          title="Order"
          actions={
            <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
              Back
            </Button>
          }
        />
        <Card>
          <EmptyState
            icon={ReceiptCancelled}
            title={error ? 'Could not load this order' : 'Order not found'}
            description={error ?? 'It may have been removed since the list was loaded.'}
          />
        </Card>
      </FormBody>
    );
  }

  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

  const line = (label: string, value: string, emphasis = false) => (
    <div className="flex items-baseline justify-between gap-6 py-2">
      <span className={cx('text-[13px]', emphasis ? 'font-medium text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      <span className={cx('tnum text-[13.5px]', emphasis ? 'font-semibold text-foreground' : 'text-foreground')}>
        {value}
      </span>
    </div>
  );

  return (
    <FormBody>
      <PageHeader
        title={`Order #${order.orderNumber}`}
        description={`${whenLocal(order.createdAt) || 'Date unknown'} · ${itemCount} item${itemCount === 1 ? '' : 's'}`}
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="dot" color={orderStatusColor(order.orderStatus)}>
          {orderStatusLabel(order.orderStatus)}
        </Badge>
        <Badge color={paymentStatusColor(order.paymentStatus)}>{order.paymentStatus.toUpperCase()}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Items" description={`${itemCount} unit${itemCount === 1 ? '' : 's'} on this order.`} />
            {order.items.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="No line items" />
            ) : (
              <div className="divide-y divide-border">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3.5 px-5 py-3.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-hover text-subtle-foreground">
                      <ShoppingBag size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-foreground">{item.productName}</p>
                      <p className="tnum text-[12px] text-muted-foreground">
                        {item.quantity} × {money(item.price)}
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-[13.5px] font-medium text-foreground">
                      {money(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Update status"
              description="Dispatch and delivery are handled on the Delivery page; this sets the status directly."
            />
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map(s => {
                  const current = s === order.orderStatus;
                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant={current ? 'primary' : 'outline'}
                      disabled={current || updating !== null}
                      loading={updating === s}
                      onClick={() => setStatus(s)}
                    >
                      {orderStatusLabel(s)}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Summary" />
            <CardContent className="py-2">
              {line('Subtotal', money(order.subtotal))}
              {line('GST', money(order.gstAmount))}
              {order.discountAmount > 0 && line('Discount', `−${money(order.discountAmount)}`)}
              <Separator className="my-2" />
              {line('Total', money(order.finalAmount), true)}
            </CardContent>
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader title="Shipping address" />
              <CardContent>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
                  {order.shippingAddress}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </FormBody>
  );
}
