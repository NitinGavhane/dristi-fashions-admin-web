/**
 * Returns queue — a port of dristi-admin-app/lib/screens/returns_screen.dart.
 *
 * Review return/replace requests, approve (which issues a pickup OTP) or reject
 * with a reason, then verify the pickup OTP once the courier collects.
 */
import { useState } from 'react';
import { BadgeCheck, Check, CheckCircleIcon, Close, NavReturns, ShieldCheck, Truck, XCircle } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { imageUrl, returnStatusColor, returnStatusLabel } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { hasPendingReturn, returnApproved, type FulfillmentOrder } from '../types';
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
  SafeImage,
  Tag,
} from '../components/ui';
import type { PageProps } from './types';

export function ReturnsPage({ onMenu }: PageProps) {
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

  return (
    <>
      <PageHeader title="Returns" subtitle={`${orders.length} total`} onMenu={onMenu} />
      <PageBody>
        {loading ? (
          <BrandLoader />
        ) : error ? (
          <EmptyBox icon={NavReturns} message={error} />
        ) : orders.length === 0 ? (
          <EmptyBox icon={NavReturns} message="No return requests" />
        ) : (
          orders.map(o => (
            <ListCard key={o.id} className="mb-2.5">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">#{o.orderNumber}</p>
                <Tag text={returnStatusLabel(o.returnStatus)} color={returnStatusColor(o.returnStatus)} />
              </div>

              <p className="mt-1.5 text-xs text-ink-soft">
                {o.user.fullName} · {o.user.email}
              </p>
              {o.returnReason && <p className="mt-1.5 text-xs text-muted">Reason: {o.returnReason}</p>}
              {o.returnAdminNote && <p className="mt-1.5 text-xs text-error">Admin note: {o.returnAdminNote}</p>}

              {o.returnEvidence.length > 0 && (
                <div className="mt-2.5">
                  <p className="label-caps text-[9px] tracking-[2px] text-muted">Evidence</p>
                  <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
                    {o.returnEvidence.map((url, i) => {
                      const full = imageUrl(url);
                      return (
                        <button
                          key={`${url}-${i}`}
                          type="button"
                          onClick={() => setLightbox(full)}
                          className="shrink-0 overflow-hidden rounded-lg"
                          aria-label={`Open evidence image ${i + 1}`}
                        >
                          <SafeImage src={full} alt="" className="size-16 object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasPendingReturn(o) && (
                <div className="mt-3 flex gap-2.5">
                  <div className="flex-1">
                    <PrimaryButton
                      label="Reject"
                      icon={Close}
                      color="var(--color-error)"
                      onClick={() => setRejecting(o)}
                    />
                  </div>
                  <div className="flex-1">
                    <PrimaryButton
                      label="Approve"
                      icon={Check}
                      color="var(--color-success)"
                      onClick={() => setConfirmApprove(o)}
                    />
                  </div>
                </div>
              )}

              {returnApproved(o) && (
                <div className="mt-3">
                  <PrimaryButton
                    label="Verify Pickup OTP"
                    icon={BadgeCheck}
                    color="var(--color-teal)"
                    onClick={() => setVerifying(o)}
                  />
                </div>
              )}
            </ListCard>
          ))
        )}
      </PageBody>

      {confirmApprove && (
        <Modal
          title="Approve Return"
          icon={CheckCircleIcon}
          accent="var(--color-success)"
          onClose={() => setConfirmApprove(null)}
          actions={
            <>
              <GhostButton label="Cancel" onClick={() => setConfirmApprove(null)} />
              <PrimaryButton
                label="Approve"
                full={false}
                color="var(--color-success)"
                onClick={() => approve(confirmApprove)}
              />
            </>
          }
        >
          <p className="text-[13px] text-ink-soft">
            Approve the return/replace request for #{confirmApprove.orderNumber}? A pickup OTP will be sent to the
            customer.
          </p>
        </Modal>
      )}

      {approvedOtp && (
        <Modal
          title="Return Approved"
          icon={Truck}
          accent="var(--color-success)"
          onClose={() => setApprovedOtp(null)}
          actions={<PrimaryButton label="OK" full={false} onClick={() => setApprovedOtp(null)} />}
        >
          <p className="text-[13px] text-ink-soft">#{approvedOtp.order.orderNumber}</p>
          <p className="mt-3.5 text-xs text-muted">Pickup OTP (relay to the customer):</p>
          <div className="mt-2">
            <OtpDisplay otp={approvedOtp.otp} />
          </div>
          <p className="mt-2.5 text-[11px] text-muted">
            Expires in 10 minutes. The customer reads this back to the pickup partner.
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
          className="fixed inset-0 z-[95] grid place-items-center bg-black/80 p-6"
        >
          <img src={lightbox} alt="Return evidence" className="max-h-[85vh] max-w-full object-contain" />
        </button>
      )}
    </>
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
      title="Reject Return"
      icon={XCircle}
      accent="var(--color-error)"
      onClose={onClose}
      actions={
        <>
          <GhostButton label="Cancel" onClick={onClose} disabled={busy} />
          <PrimaryButton
            label="Reject"
            full={false}
            color="var(--color-error)"
            loading={busy}
            onClick={submit}
          />
        </>
      }
    >
      <p className="text-[13px] text-ink-soft">#{order.orderNumber}</p>
      <p className="mt-3 text-xs text-muted">Reason (sent to the customer):</p>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={3}
        autoFocus
        aria-label="Rejection reason"
        placeholder="e.g. Item shows signs of use beyond the return window"
        className="mt-2 w-full resize-y rounded-2xl border border-hair bg-white/[0.03] px-3 py-2.5 text-[13px] text-ink placeholder:text-xs placeholder:text-muted focus:border-error focus:outline-none focus:ring-1 focus:ring-error"
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
      title="Verify Pickup"
      icon={ShieldCheck}
      accent="var(--color-success)"
      onClose={onClose}
      actions={
        <>
          <GhostButton label="Cancel" onClick={onClose} disabled={busy} />
          <PrimaryButton
            label="Complete pickup"
            full={false}
            loading={busy}
            disabled={!otp}
            onClick={submit}
          />
        </>
      }
    >
      <p className="text-[13px] text-ink-soft">#{order.orderNumber}</p>
      <p className="mt-3.5 text-xs text-muted">Enter the pickup OTP the customer read out:</p>
      <div className="mt-2.5">
        <OtpInput value={otp} onChange={setOtp} />
      </div>
    </Modal>
  );
}
