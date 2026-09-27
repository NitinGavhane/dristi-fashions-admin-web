/**
 * Refer & earn control room — a port of
 * dristi-admin-app/lib/screens/referrals_screen.dart.
 *
 * Every purchase made by a customer who arrived on someone's share link lands
 * here as *pending*. Nothing is ever paid automatically: the admin approves a
 * commission (suggested from the store-wide %, editable per sale) and only then
 * does the money reach the referrer's wallet.
 */
import { useCallback, useState } from 'react';
import { Settings, Share2, Trophy, Users } from 'lucide-react';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { money, trimAmount } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { isPendingReferral, type ReferralPurchase, type ReferralSettings } from '../types';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  EmptyBox,
  FloatingAction,
  GhostButton,
  ListCard,
  Modal,
  NoteBox,
  PageHeader,
  PillTabs,
  PrimaryButton,
  TextInput,
  ToggleRow,
} from '../components/ui';
import type { PageProps } from './types';

type Tab = 'pending' | 'all' | 'referrers';

export function ReferralsPage({ onMenu }: PageProps) {
  const [tab, setTab] = useState<Tab>('pending');
  const toast = useToast();
  const confirm = useConfirm();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [approving, setApproving] = useState<ReferralPurchase | null>(null);

  const fetch = useCallback(async () => {
    const [settings, purchases, referrers] = await Promise.all([
      api.getReferralSettings(),
      api.getReferralPurchases(tab === 'all' ? undefined : tab === 'pending' ? 'pending' : undefined),
      api.getReferralUserReport(),
    ]);
    return {
      settings,
      purchases,
      // Only people who actually brought in business are worth listing.
      referrers: referrers
        .filter(r => r.totalPurchases > 0 || r.totalClicks > 0)
        .sort((a, b) => b.totalEarnings - a.totalEarnings),
    };
  }, [tab]);

  const { data, loading, error, reload } = useAsync(fetch, [tab]);

  const settings: ReferralSettings = data?.settings ?? { enabled: true, commissionPercentage: 5 };
  const purchases = data?.purchases ?? [];
  const referrers = data?.referrers ?? [];
  const pendingCount = purchases.filter(isPendingReferral).length;

  const reject = async (p: ReferralPurchase) => {
    const ok = await confirm({
      title: 'REJECT',
      confirmLabel: 'Reject',
      message: `Reject the commission for ${p.referrerName}? Nothing will be paid for this order.`,
    });
    if (!ok) return;
    try {
      await api.rejectReferral(p.id);
      toast('Referral rejected', { success: true });
      reload();
    } catch (e) {
      toast(`Reject failed: ${errorMessage(e)}`, { error: true });
    }
  };

  const purchaseList = () => {
    if (purchases.length === 0) {
      return (
        <EmptyBox
          icon={Users}
          message={tab === 'pending' ? 'No commissions waiting' : 'No referred sales yet'}
        />
      );
    }

    return purchases.map(p => {
      const [statusColor, statusLabel] =
        p.status === 'approved'
          ? ['var(--color-success)', `PAID ${money(p.rewardAmount)}`]
          : p.status === 'pending'
            ? ['var(--color-warning)', 'PENDING']
            : ['var(--color-error)', p.status.toUpperCase()];

      return (
        <ListCard key={p.id} className="mb-2.5">
          <div className="flex items-start gap-3.5">
            <span className="grid size-[52px] shrink-0 place-items-center rounded-input bg-gradient-to-br from-coral to-coral-80 text-white">
              <Share2 size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{p.referrerName}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-soft">
                {p.referredUserName ?? 'A customer'} bought{p.productName ? ` ${p.productName}` : ''}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Order {p.orderNumber ?? '—'} · {money(p.purchaseAmount)}
              </p>
            </div>
            <span
              className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold"
              style={{
                color: statusColor,
                backgroundColor: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
              }}
            >
              {statusLabel}
            </span>
          </div>

          {isPendingReferral(p) && (
            <div className="mt-3 flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => setApproving(p)}
                className="label-caps flex-1 rounded-lg bg-btn py-2.5 text-[10px] font-bold tracking-[1.5px] text-white shadow-violet transition hover:brightness-110"
              >
                Give commission
              </button>
              <button
                type="button"
                onClick={() => reject(p)}
                aria-label={`Reject commission for ${p.referrerName}`}
                className="grid w-11 place-items-center rounded-lg border border-error text-error transition hover:bg-error/5"
              >
                <span aria-hidden className="text-base leading-none">
                  ✕
                </span>
              </button>
            </div>
          )}
        </ListCard>
      );
    });
  };

  const referrerList = () => {
    if (referrers.length === 0) return <EmptyBox icon={Trophy} message="No one has shared yet" />;
    return referrers.map(r => (
      <ListCard key={r.userId} className="mb-2.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{r.userName}</p>
            <p className="truncate text-[11px] text-muted">{r.userEmail}</p>
            <p className="mt-1 text-[11px] text-ink-soft">
              {r.totalClicks} clicks · {r.totalPurchases} sales
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-extrabold text-success">{money(r.totalEarnings)}</p>
            {r.pendingRewards > 0 && (
              <p className="text-[10px] text-warning">{money(r.pendingRewards)} pending</p>
            )}
          </div>
        </div>
      </ListCard>
    ));
  };

  return (
    <>
      <PageHeader
        title="Referrals"
        subtitle={
          settings.enabled
            ? `${pendingCount} PENDING · ${trimAmount(settings.commissionPercentage)}% DEFAULT`
            : 'PROGRAMME OFF'
        }
        onMenu={onMenu}
      />
      <PageBody>
        <PillTabs<Tab>
          tabs={[
            { id: 'pending', label: 'PENDING' },
            { id: 'all', label: 'ALL SALES' },
            { id: 'referrers', label: 'REFERRERS' },
          ]}
          active={tab}
          onSelect={setTab}
        />

        <div className="mt-3">
          {loading ? (
            <BrandLoader />
          ) : error ? (
            <EmptyBox icon={Share2} message={`Could not load referrals: ${error}`} />
          ) : tab === 'referrers' ? (
            referrerList()
          ) : (
            purchaseList()
          )}
        </div>
      </PageBody>

      <FloatingAction onClick={() => setSettingsOpen(true)} label="Commission settings" icon={Settings} />

      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            reload();
          }}
        />
      )}

      {approving && (
        <ApproveDialog
          purchase={approving}
          defaultPercentage={settings.commissionPercentage}
          onClose={() => setApproving(null)}
          onApproved={() => {
            setApproving(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function SettingsDialog({
  settings,
  onClose,
  onSaved,
}: {
  settings: ReferralSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [percentage, setPercentage] = useState(trimAmount(settings.commissionPercentage));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.updateReferralSettings({
        enabled,
        commission_percentage: Number.parseFloat(percentage.trim()) || 0,
      });
      toast('Referral settings saved', { success: true });
      onSaved();
    } catch (e) {
      toast(`Save failed: ${errorMessage(e)}`, { error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="REFER & EARN"
      icon={Share2}
      onClose={onClose}
      actions={
        <>
          <GhostButton label="Cancel" onClick={onClose} disabled={busy} />
          <PrimaryButton label="Save" full={false} loading={busy} onClick={save} />
        </>
      }
    >
      <ToggleRow label="Programme active" value={enabled} onChange={setEnabled} />
      <div className="mt-3">
        <TextInput
          label="Default commission (%)"
          value={percentage}
          onChange={setPercentage}
          number
          hint="e.g. 5"
        />
      </div>
      <NoteBox>
        {enabled
          ? 'New referred sales suggest this % of the product subtotal (before GST and delivery). You can still change the amount on each sale before approving.'
          : 'Turned off: no new referral earnings are recorded and the app stops advertising a commission. Sales already pending stay approvable.'}
      </NoteBox>
    </Modal>
  );
}

function ApproveDialog({
  purchase,
  defaultPercentage,
  onClose,
  onApproved,
}: {
  purchase: ReferralPurchase;
  defaultPercentage: number;
  onClose: () => void;
  onApproved: () => void;
}) {
  const toast = useToast();
  const [percentage, setPercentage] = useState(
    trimAmount(purchase.rewardPercentage > 0 ? purchase.rewardPercentage : defaultPercentage),
  );
  const [fixed, setFixed] = useState('');
  const [busy, setBusy] = useState(false);

  /** A fixed rupee amount overrides the percentage for this one sale. */
  const computed = (): number => {
    const flat = Number.parseFloat(fixed.trim());
    if (Number.isFinite(flat) && flat > 0) return flat;
    const pct = Number.parseFloat(percentage.trim()) || 0;
    return (purchase.purchaseAmount * pct) / 100;
  };

  const payout = computed();

  const submit = async () => {
    setBusy(true);
    const flat = Number.parseFloat(fixed.trim());
    try {
      await api.approveReferral(purchase.id, {
        rewardPercentage: Number.parseFloat(percentage.trim()) || 0,
        rewardAmount: Number.isFinite(flat) && flat > 0 ? flat : null,
      });
      toast(`Commission paid to ${purchase.referrerName}`, { success: true });
      onApproved();
    } catch (e) {
      toast(`Approval failed: ${errorMessage(e)}`, { error: true });
    } finally {
      setBusy(false);
    }
  };

  const row = (label: string, value: string) => (
    <div className="mb-1.5 flex items-start gap-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right text-xs font-bold text-ink">{value}</span>
    </div>
  );

  return (
    <Modal
      title="PAY COMMISSION"
      icon={Share2}
      onClose={onClose}
      actions={
        <>
          <GhostButton label="Cancel" onClick={onClose} disabled={busy} />
          <PrimaryButton
            label="Approve & pay"
            full={false}
            loading={busy}
            disabled={payout <= 0}
            onClick={submit}
          />
        </>
      }
    >
      {row('Referrer', purchase.referrerName)}
      {row('Bought by', purchase.referredUserName ?? '—')}
      {purchase.productName && row('Product', purchase.productName)}
      {row('Order', purchase.orderNumber ?? purchase.orderId)}
      {row('Order value', money(purchase.purchaseAmount))}

      <div className="mt-3">
        <TextInput label="Commission (%)" value={percentage} onChange={setPercentage} number />
        <TextInput
          label="Or fixed amount (₹)"
          value={fixed}
          onChange={setFixed}
          number
          hint="Optional — overrides the %"
        />
      </div>

      <NoteBox>
        {money(payout)} will be credited to {purchase.referrerName}&apos;s wallet straight away.
      </NoteBox>
    </Modal>
  );
}
