/**
 * Returns queue — a port of dristi-admin-app/lib/screens/returns_screen.dart.
 *
 * Review return/replace requests, approve (which issues a pickup OTP) or reject
 * with a reason, then verify the pickup OTP once the courier collects.
 */
import { useState } from 'react';
import {
  BadgeCheck,
  Check,
  CheckCircleIcon,
  Close,
  NavReturns,
  ShieldCheck,
  Truck,
  XCircle,
} from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { imageUrl, money, returnStatusColor, returnStatusLabel, whenLocal } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { hasPendingReturn, returnApproved, type FulfillmentOrder } from '../types';
import { useToast } from '../context/AdminContext';
import { PageBody, PageHeader } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, Button, SectionHeading, Textarea } from '../components/primitives';
import { Modal, OtpDisplay, OtpInput, SafeImage } from '../components/ui';
import type { PageProps } from './types';

export function ReturnsPage(_: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getReturnOrders(), []);
  const toast = useToast();

  const [confirmApprove, setConfirmApprove] = useState<FulfillmentOrder | null>(null);
  const [approvedOtp, setApprovedOtp] = useState<{ order: FulfillmentOrder; otp: string } | null>(null);
  const [rejecting, setRejecting] = useState<FulfillmentOrder | null>(null);
  const [verifying, setVerifying] = useState<FulfillmentOrder | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const orders = data ?? [];

  const approve = async (o: FulfillmentOrder) => {
    setConfirmApprove(null);
    try {
      const res = await api.approveReturn(o.id);
      reload();
      setApprovedOtp({ order: o, otp: res.pickupOtp ?? '' });
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
      id: 'reason',
      header: 'Reason',
      cell: o => (
        <div className="min-w-0 max-w-[20rem]">
          <p className="line-clamp-2 text-[12.5px] text-muted-foreground">{o.returnReason || '—'}</p>
          {o.returnAdminNote && (
            <p className="mt-1 line-clamp-1 text-[11.5px] text-destructive">Note: {o.returnAdminNote}</p>
          )}
        </div>
      ),
    },
    {
      id: 'evidence',
      header: 'Evidence',
      secondary: true,
      cell: o =>
        o.returnEvidence.length === 0 ? (
          <span className="text-subtle-foreground">—</span>
        ) : (
          <div className="flex items-center gap-1.5">
            {o.returnEvidence.slice(0, 3).map((url, i) => {
              const full = imageUrl(url);
              return (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setLightbox(full);
                  }}
                  className="overflow-hidden rounded-md border border-border transition-transform duration-150 hover:scale-105"
                  aria-label={`Open evidence image ${i + 1}`}
                >
                  <SafeImage src={full} alt="" className="size-9 object-cover" />
                </button>
              );
            })}
            {o.returnEvidence.length > 3 && (
              <span className="text-[11.5px] text-subtle-foreground">+{o.returnEvidence.length - 3}</span>
            )}
          </div>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: o => o.returnStatus ?? '',
      cell: o => (
        <Badge variant="dot" color={returnStatusColor(o.returnStatus)}>
          {returnStatusLabel(o.returnStatus)}
        </Badge>
      ),
    },
    {
      id: 'amount',
      header: 'Order total',
      align: 'right',
      secondary: true,
      sortValue: o => o.finalAmount,
      cell: o => <span className="tnum text-foreground">{money(o.finalAmount)}</span>,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Returns"
        description={`${orders.filter(hasPendingReturn).length} waiting on a decision.`}
      />

      <DataTable
        rows={orders}
        columns={columns}
        rowKey={o => o.id}
        loading={loading}
        initialSort={{ id: 'order', dir: 'desc' }}
        rowActions={o => (
          <div className="flex items-center justify-end gap-2">
            {hasPendingReturn(o) && (
              <>
                <Button size="sm" variant="outline" icon={Close} onClick={() => setRejecting(o)}>
                  Reject
                </Button>
                <Button size="sm" variant="success" icon={Check} onClick={() => setConfirmApprove(o)}>
                  Approve
                </Button>
              </>
            )}
            {returnApproved(o) && (
              <Button size="sm" variant="primary" icon={BadgeCheck} onClick={() => setVerifying(o)}>
                Verify pickup
              </Button>
            )}
          </div>
        )}
        empty={{
          icon: NavReturns,
          title: error ? 'Could not load returns' : 'No return requests',
          description: error ?? 'Requests raised by customers will appear here for review.',
        }}
      />

      {confirmApprove && (
        <Modal
          title="Approve return"
          description={`A pickup OTP will be issued for #${confirmApprove.orderNumber}.`}
          icon={CheckCircleIcon}
          accent="var(--color-success)"
          onClose={() => setConfirmApprove(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirmApprove(null)}>
                Cancel
              </Button>
              <Button variant="success" icon={Check} onClick={() => approve(confirmApprove)}>
                Approve return
              </Button>
            </>
          }
        >
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            The customer reads the OTP back to the pickup partner when the item is collected.
          </p>
        </Modal>
      )}

      {approvedOtp && (
        <Modal
          title="Return approved"
          description={`#${approvedOtp.order.orderNumber}`}
          icon={Truck}
          accent="var(--color-success)"
          onClose={() => setApprovedOtp(null)}
          actions={
            <Button variant="primary" onClick={() => setApprovedOtp(null)}>
              Done
            </Button>
          }
        >
          <SectionHeading title="Pickup OTP" description="Read this out to the customer." />
          <OtpDisplay otp={approvedOtp.otp} />
          <p className="mt-3 text-[12px] text-muted-foreground">
            Expires in 10 minutes. The customer reads it back to the pickup partner.
          </p>
        </Modal>
      )}

      {rejecting && (
        <RejectDialog
          order={rejecting}
          onClose={() => setRejecting(null)}
          onRejected={() => {
            setRejecting(null);
            reload();
          }}
        />
      )}

      {verifying && (
        <VerifyPickupDialog
          order={verifying}
          onClose={() => setVerifying(null)}
          onVerified={() => {
            setVerifying(null);
            reload();
          }}
        />
      )}

      {lightbox && (
        <button
          type="button"
          onClick={() => setLightbox(null)}
          aria-label="Close image"
          className="animate-overlay fixed inset-0 z-[95] grid place-items-center bg-black/85 p-6 backdrop-blur-sm"
        >
          <img src={lightbox} alt="Return evidence" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
        </button>
      )}
    </PageBody>
  );
}

function RejectDialog({
  order,
  onClose,
  onRejected,
}: {
  order: FulfillmentOrder;
  onClose: () => void;
  onRejected: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    // A rejection reason is required — it is sent to the customer.
    if (!reason.trim()) {
      toast('A rejection reason is required', { error: true });
      return;
    }
    setBusy(true);
    try {
      await api.rejectReturn(order.id, reason.trim());
      toast('Return rejected', { success: true });
      onRejected();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Reject return"
      description={`#${order.orderNumber}`}
      icon={XCircle}
      accent="var(--color-destructive)"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" loading={busy} onClick={submit}>
            Reject return
          </Button>
        </>
      }
    >
      <Textarea
        label="Reason"
        required
        rows={4}
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="e.g. Item shows signs of use beyond the return window"
        description="Sent to the customer, so write it as they will read it."
        autoFocus
      />
    </Modal>
  );
}

function VerifyPickupDialog({
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
      await api.verifyReturnPickup(order.id, otp.trim());
      toast('Return pickup complete', { success: true });
      onVerified();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Verify pickup"
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
            Complete pickup
          </Button>
        </>
      }
    >
      <OtpInput value={otp} onChange={setOtp} />
    </Modal>
  );
}
