/**
 * Delivery — a port of dristi-admin-app/lib/screens/delivery_screen.dart.
 *
 * Orders awaiting dispatch and parcels in transit. Dispatch issues a delivery
 * OTP for the operator to relay; verifying that OTP marks the order delivered.
 */
import { useState } from 'react';
import {
  BadgeCheck,
  ExternalLink,
  MoreHorizontal,
  Refresh,
  ShieldCheck,
  Truck,
} from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { money, orderStatusColor, orderStatusLabel, whenLocal } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { inTransit, needsDispatch, type DispatchResult, type FulfillmentOrder } from '../types';
import { useToast } from '../context/AdminContext';
import { PageBody, PageHeader } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import {
  Badge,
  Button,
  DropdownMenu,
  MenuItem,
  SectionHeading,
} from '../components/primitives';
import { Modal, OtpDisplay, OtpInput, PillTabs } from '../components/ui';
import type { PageProps } from './types';

type Tab = 'dispatch' | 'transit';

export function DeliveryPage(_: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getDeliveryOrders(), []);
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('dispatch');
  /** orderId -> live ShipRocket status from the tracking endpoint. */
  const [liveStatus, setLiveStatus] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [dispatched, setDispatched] = useState<{ order: FulfillmentOrder; result: DispatchResult } | null>(null);
  const [verifying, setVerifying] = useState<FulfillmentOrder | null>(null);

  const orders = data ?? [];
  const awaiting = orders.filter(needsDispatch);
  const transit = orders.filter(inTransit);
  const rows = tab === 'dispatch' ? awaiting : transit;

  /** Pulls the latest ShipRocket status for one in-transit order. */
  const refreshTracking = async (o: FulfillmentOrder) => {
    if (refreshing.has(o.id)) return;
    setRefreshing(s => new Set(s).add(o.id));
    try {
      const res = await api.getDeliveryTracking(o.id);
      const live = res.shipmentStatus ?? o.shipmentStatus;
      if (live) setLiveStatus(m => ({ ...m, [o.id]: live }));
    } catch {
      toast('Could not refresh tracking status', { error: true });
    } finally {
      setRefreshing(s => {
        const next = new Set(s);
        next.delete(o.id);
        return next;
      });
    }
  };

  const dispatch = async (o: FulfillmentOrder) => {
    try {
      const result = await api.dispatchOrder(o.id);
      reload();
      setDispatched({ order: o, result });
    } catch (e) {
      toast(errorMessage(e), { error: true });
    }
  };

  const columns: Column<FulfillmentOrder>[] = [
    {
      id: 'order',
      header: 'Order',
      sortValue: o => o.orderNumber,
      cell: o => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12.5px] font-medium text-foreground">#{o.orderNumber}</p>
          <p className="truncate text-[12px] text-muted-foreground">{whenLocal(o.createdAt)}</p>
        </div>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      sortValue: o => o.user.fullName,
      cell: o => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{o.user.fullName}</p>
          <p className="truncate text-[12px] text-muted-foreground">{o.user.email}</p>
        </div>
      ),
    },
    {
      id: 'address',
      header: 'Ship to',
      secondary: true,
      cell: o => (
        <p className="line-clamp-2 max-w-[18rem] text-[12.5px] text-muted-foreground">
          {o.shippingAddress || '—'}
        </p>
      ),
    },
    {
      id: 'courier',
      header: 'Courier',
      secondary: true,
      cell: o => {
        const status = liveStatus[o.id] ?? o.shipmentStatus;
        if (!o.courierName && !o.awbCode) {
          return (
            <Badge color={o.shiprocketSynced ? 'var(--color-success)' : 'var(--color-warning)'}>
              {o.shiprocketSynced ? 'In ShipRocket' : 'Not synced'}
            </Badge>
          );
        }
        return (
          <div className="min-w-0">
            {o.courierName && <p className="truncate text-[12.5px] text-foreground">{o.courierName}</p>}
            {o.awbCode && <p className="truncate font-mono text-[11.5px] text-muted-foreground">{o.awbCode}</p>}
            {status && <p className="truncate text-[11.5px] text-success">{status}</p>}
          </div>
        );
      },
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
      id: 'amount',
      header: 'Total',
      align: 'right',
      sortValue: o => o.finalAmount,
      cell: o => <span className="tnum font-medium text-foreground">{money(o.finalAmount)}</span>,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Delivery"
        description="Dispatch what is waiting, and confirm what has arrived."
      />

      <div className="mb-5">
        <PillTabs<Tab>
          tabs={[
            { id: 'dispatch', label: 'Awaiting dispatch', count: awaiting.length },
            { id: 'transit', label: 'In transit', count: transit.length },
          ]}
          active={tab}
          onSelect={setTab}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={o => o.id}
        loading={loading}
        initialSort={{ id: 'order', dir: 'desc' }}
        rowActions={o => (
          <div className="flex items-center justify-end gap-2">
            {tab === 'dispatch' ? (
              <Button size="sm" variant="success" icon={Truck} onClick={() => dispatch(o)}>
                Dispatch
              </Button>
            ) : (
              <Button size="sm" variant="primary" icon={BadgeCheck} onClick={() => setVerifying(o)}>
                Verify
              </Button>
            )}

            {(o.trackingUrl || o.awbCode) && (
              <DropdownMenu
                label={`More actions for ${o.orderNumber}`}
                trigger={
                  <span className="grid size-8 place-items-center rounded-lg text-subtle-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
                    <MoreHorizontal size={16} />
                  </span>
                }
              >
                <MenuItem icon={Refresh} onSelect={() => refreshTracking(o)}>
                  {refreshing.has(o.id) ? 'Refreshing…' : 'Refresh tracking'}
                </MenuItem>
                {o.trackingUrl && (
                  <MenuItem
                    icon={ExternalLink}
                    onSelect={() => window.open(o.trackingUrl!, '_blank', 'noopener,noreferrer')}
                  >
                    Open tracking
                  </MenuItem>
                )}
              </DropdownMenu>
            )}
          </div>
        )}
        empty={{
          icon: Truck,
          title: error
            ? 'Could not load deliveries'
            : tab === 'dispatch'
              ? 'Nothing waiting to dispatch'
              : 'Nothing in transit',
          description:
            error ?? (tab === 'dispatch' ? 'Paid orders appear here ready to send out.' : 'Dispatched parcels appear here until they are delivered.'),
        }}
      />

      {dispatched && (
        <DispatchedDialog
          order={dispatched.order}
          result={dispatched.result}
          onClose={() => setDispatched(null)}
        />
      )}

      {verifying && (
        <VerifyDeliveryDialog
          order={verifying}
          onClose={() => setVerifying(null)}
          onVerified={() => {
            setVerifying(null);
            reload();
          }}
        />
      )}
    </PageBody>
  );
}

function DispatchedDialog({
  order,
  result,
  onClose,
}: {
  order: FulfillmentOrder;
  result: DispatchResult;
  onClose: () => void;
}) {
  const awb = result.courier?.awbCode;
  const courierName = result.courier?.courierName;

  return (
    <Modal
      title="Order dispatched"
      description={`#${order.orderNumber} is on its way.`}
      icon={Truck}
      accent="var(--color-success)"
      onClose={onClose}
      actions={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      {result.courierError ? (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <p className="text-[12.5px] text-warning">Courier: {result.courierError}</p>
        </div>
      ) : awb ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge color="var(--color-success)">{courierName ?? 'Courier'}</Badge>
          <Badge>{awb}</Badge>
        </div>
      ) : null}

      <SectionHeading title="Delivery OTP" description="Read this out to the customer." />
      <OtpDisplay otp={result.deliveryOtp ?? ''} />
      <p className="mt-3 text-[12px] text-muted-foreground">
        Expires in 10 minutes. The customer reads it back to the delivery partner.
      </p>
    </Modal>
  );
}

function VerifyDeliveryDialog({
  order,
  onClose,
  onVerified,
}: {
  order: FulfillmentOrder;
  onClose: () => void;
  onVerified: () => void;
}) {
  const toast = useToast();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.verifyDeliveryOtp(order.id, otp.trim());
      toast('Delivery confirmed', { success: true });
      onVerified();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Verify delivery"
      description={`Enter the OTP the customer read out for #${order.orderNumber}.`}
      icon={ShieldCheck}
      accent="var(--color-success)"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={otp.length < 6} onClick={submit}>
            Confirm delivery
          </Button>
        </>
      }
    >
      <OtpInput value={otp} onChange={setOtp} />
    </Modal>
  );
}
