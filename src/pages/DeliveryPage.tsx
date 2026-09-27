/**
 * Delivery dashboard — a port of dristi-admin-app/lib/screens/delivery_screen.dart.
 *
 * Orders awaiting dispatch and parcels in transit. Dispatch issues a delivery
 * OTP for the operator to relay to the customer; verifying that OTP marks the
 * order delivered.
 */
import { useState } from 'react';
import { BadgeCheck, ExternalLink, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { money, orderStatusColor, orderStatusLabel } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { inTransit, needsDispatch, type DispatchResult, type FulfillmentOrder } from '../types';
import { useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  EmptyBox,
  GhostButton,
  ListCard,
  Modal,
  OtpDisplay,
  OtpInput,
  PageHeader,
  PrimaryButton,
  SectionLabel,
  Tag,
} from '../components/ui';
import type { PageProps } from './types';

export function DeliveryPage({ onMenu }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getDeliveryOrders(), []);
  const toast = useToast();

  /** orderId -> live ShipRocket status string (from the tracking endpoint). */
  const [liveStatus, setLiveStatus] = useState<Record<string, string>>({});
  /** orderId set while a live refresh is in flight. */
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());

  const [dispatched, setDispatched] = useState<{ order: FulfillmentOrder; result: DispatchResult } | null>(null);
  const [verifying, setVerifying] = useState<FulfillmentOrder | null>(null);

  const orders = data ?? [];
  const awaiting = orders.filter(needsDispatch);
  const transit = orders.filter(inTransit);

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

  const card = (o: FulfillmentOrder, canDispatch: boolean) => {
    const accent = orderStatusColor(o.orderStatus);
    const status = liveStatus[o.id] ?? o.shipmentStatus;
    const isRefreshing = refreshing.has(o.id);

    return (
      <ListCard key={o.id} className="mb-2.5">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">#{o.orderNumber}</p>
          <Tag text={orderStatusLabel(o.orderStatus)} color={accent} />
        </div>

        <p className="mt-1.5 text-[13px] font-semibold text-ink-soft">{o.user.fullName}</p>
        <p className="text-[11px] text-muted">{o.user.email}</p>
        {o.shippingAddress && <p className="mt-1 line-clamp-2 text-[11px] text-muted">{o.shippingAddress}</p>}

        {(o.awbCode || o.courierName) && (
          <div className="mt-2">
            {o.courierName && <p className="text-xs font-semibold text-ink-soft">Courier: {o.courierName}</p>}
            {o.awbCode && <p className="truncate text-xs text-muted">AWB: {o.awbCode}</p>}
            {status && <p className="text-xs text-success">Status: {status}</p>}
          </div>
        )}

        <div className="mt-2">
          <span
            className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.4px]"
            style={{
              color: o.shiprocketSynced ? 'var(--color-success)' : 'var(--color-warning)',
              backgroundColor: `color-mix(in srgb, ${
                o.shiprocketSynced ? 'var(--color-success)' : 'var(--color-warning)'
              } 12%, transparent)`,
            }}
          >
            {o.shiprocketSynced ? 'In ShipRocket' : 'Not in ShipRocket'}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-base font-black text-coral">{money(o.finalAmount)}</span>
          <span className="flex-1" />
          {(o.trackingUrl || o.awbCode) && (
            <PrimaryButton
              label={isRefreshing ? 'Refreshing' : 'Refresh'}
              full={false}
              icon={RefreshCw}
              color="var(--color-info)"
              loading={isRefreshing}
              onClick={() => refreshTracking(o)}
            />
          )}
          {o.trackingUrl && (
            <a
              href={o.trackingUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="label-caps inline-flex h-10 items-center gap-2 rounded-btn border px-5 text-[10px] tracking-[1.5px] text-white"
              style={{
                backgroundColor: 'var(--color-info)',
                borderColor: 'color-mix(in srgb, var(--color-info) 75%, black)',
              }}
            >
              <ExternalLink size={16} />
              Track
            </a>
          )}
          {canDispatch ? (
            <PrimaryButton
              label="Dispatch"
              full={false}
              icon={Truck}
              color="var(--color-success)"
              onClick={() => dispatch(o)}
            />
          ) : (
            <PrimaryButton
              label="Verify OTP"
              full={false}
              icon={BadgeCheck}
              color="var(--color-teal)"
              onClick={() => setVerifying(o)}
            />
          )}
        </div>
      </ListCard>
    );
  };

  return (
    <>
      <PageHeader
        title="Delivery"
        subtitle={`${awaiting.length} TO DISPATCH · ${transit.length} IN TRANSIT`}
        onMenu={onMenu}
      />
      <PageBody>
        {loading ? (
          <BrandLoader />
        ) : error ? (
          <EmptyBox icon={Truck} message={error} />
        ) : awaiting.length === 0 && transit.length === 0 ? (
          <EmptyBox icon={Truck} message="No active deliveries" />
        ) : (
          <>
            {awaiting.length > 0 && (
              <>
                <SectionLabel title="Awaiting Dispatch" />
                {awaiting.map(o => card(o, true))}
              </>
            )}
            {transit.length > 0 && (
              <>
                <SectionLabel title="In Transit" />
                {transit.map(o => card(o, false))}
              </>
            )}
          </>
        )}
      </PageBody>

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
    </>
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
      title="Order Dispatched"
      icon={Truck}
      accent="var(--color-success)"
      onClose={onClose}
      actions={<PrimaryButton label="OK" full={false} onClick={onClose} />}
    >
      <p className="text-[13px] text-ink-soft">#{order.orderNumber}</p>

      {result.courierError ? (
        <div className="mt-3 rounded-lg bg-warning/[0.12] p-2.5">
          <p className="text-xs font-semibold text-warning">Courier: {result.courierError}</p>
        </div>
      ) : awb ? (
        <p className="mt-3 text-xs font-semibold text-success">
          Courier: {courierName ?? '--'} · AWB: {awb}
        </p>
      ) : null}

      <p className="mt-3.5 text-xs text-muted">Delivery OTP (relay this to the customer):</p>
      <div className="mt-2">
        <OtpDisplay otp={result.deliveryOtp ?? ''} />
      </div>
      <p className="mt-2.5 text-[11px] text-muted">
        Expires in 10 minutes. The customer reads this back to the delivery partner.
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
      title="Verify Delivery"
      icon={ShieldCheck}
      accent="var(--color-success)"
      onClose={onClose}
      actions={
        <>
          <GhostButton label="Cancel" onClick={onClose} disabled={busy} />
          <PrimaryButton label="Verify" full={false} loading={busy} disabled={!otp} onClick={submit} />
        </>
      }
    >
      <p className="text-[13px] text-ink-soft">#{order.orderNumber}</p>
      <p className="mt-3.5 text-xs text-muted">Enter the delivery OTP the customer read out:</p>
      <div className="mt-2.5">
        <OtpInput value={otp} onChange={setOtp} />
      </div>
    </Modal>
  );
}
