/**
 * Refer & earn — a port of dristi-admin-app/lib/screens/referrals_screen.dart.
 *
 * Every purchase made by a customer who arrived on someone's share link lands
 * here as *pending*. Nothing is ever paid automatically: the admin approves a
 * commission (suggested from the store-wide %, editable per sale) and only then
 * does the money reach the referrer's wallet.
 */
import { useCallback, useState } from 'react';
import { Check, Close, NavUsers, Settings, Share, Trophy } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { money, trimAmount, whenLocal } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { isPendingReferral, type ReferralPurchase, type ReferralSettings } from '../types';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody, PageHeader } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, Button, Input, SectionHeading, Switch } from '../components/primitives';
import { Modal, NoteBox, PillTabs } from '../components/ui';
import type { PageProps } from './types';

type Tab = 'pending' | 'all' | 'referrers';

export function ReferralsPage(_: PageProps) {
  const [tab, setTab] = useState<Tab>('pending');
  const toast = useToast();
  const confirm = useConfirm();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [approving, setApproving] = useState<ReferralPurchase | null>(null);

  const fetch = useCallback(async () => {
    const [settings, purchases, referrers] = await Promise.all([
      api.getReferralSettings(),
      api.getReferralPurchases(tab === 'pending' ? 'pending' : undefined),
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
      title: 'Reject commission',
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

  const purchaseColumns: Column<ReferralPurchase>[] = [
    {
      id: 'referrer',
      header: 'Referrer',
      sortValue: p => p.referrerName,
      cell: p => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{p.referrerName}</p>
          <p className="truncate text-[12px] text-muted-foreground">{p.referrerEmail}</p>
        </div>
      ),
    },
    {
      id: 'buyer',
      header: 'Bought by',
      secondary: true,
      sortValue: p => p.referredUserName ?? '',
      cell: p => (
        <div className="min-w-0">
          <p className="truncate text-foreground">{p.referredUserName ?? 'A customer'}</p>
          {p.productName && <p className="truncate text-[12px] text-muted-foreground">{p.productName}</p>}
        </div>
      ),
    },
    {
      id: 'order',
      header: 'Order',
      secondary: true,
      sortValue: p => p.orderNumber ?? '',
      cell: p => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] text-muted-foreground">#{p.orderNumber ?? '—'}</p>
          <p className="truncate text-[11.5px] text-subtle-foreground">{whenLocal(p.createdAt)}</p>
        </div>
      ),
    },
    {
      id: 'value',
      header: 'Order value',
      align: 'right',
      sortValue: p => p.purchaseAmount,
      cell: p => <span className="tnum text-foreground">{money(p.purchaseAmount)}</span>,
    },
    {
      id: 'status',
      header: 'Commission',
      align: 'right',
      sortValue: p => p.status,
      cell: p =>
        p.status === 'approved' ? (
          <Badge variant="dot" color="var(--color-success)">
            Paid {money(p.rewardAmount)}
          </Badge>
        ) : p.status === 'pending' ? (
          <Badge variant="dot" color="var(--color-warning)">
            Pending
          </Badge>
        ) : (
          <Badge variant="dot" color="var(--color-destructive)">
            {p.status}
          </Badge>
        ),
    },
  ];

  const referrerColumns: Column<(typeof referrers)[number]>[] = [
    {
      id: 'name',
      header: 'Referrer',
      sortValue: r => r.userName,
      cell: r => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.userName}</p>
          <p className="truncate text-[12px] text-muted-foreground">{r.userEmail}</p>
        </div>
      ),
    },
    {
      id: 'clicks',
      header: 'Clicks',
      align: 'right',
      sortValue: r => r.totalClicks,
      cell: r => <span className="tnum text-muted-foreground">{r.totalClicks}</span>,
    },
    {
      id: 'sales',
      header: 'Sales',
      align: 'right',
      sortValue: r => r.totalPurchases,
      cell: r => <span className="tnum text-foreground">{r.totalPurchases}</span>,
    },
    {
      id: 'pending',
      header: 'Pending',
      align: 'right',
      secondary: true,
      sortValue: r => r.pendingRewards,
      cell: r => (
        <span className="tnum" style={{ color: r.pendingRewards > 0 ? 'var(--color-warning)' : undefined }}>
          {money(r.pendingRewards)}
        </span>
      ),
    },
    {
      id: 'earned',
      header: 'Paid out',
      align: 'right',
      sortValue: r => r.totalEarnings,
      cell: r => <span className="tnum font-medium text-success">{money(r.totalEarnings)}</span>,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Referrals"
        description={
          settings.enabled
            ? `${trimAmount(settings.commissionPercentage)}% suggested on the product subtotal. Every payout is approved by hand.`
            : 'The programme is switched off. Pending commissions can still be approved.'
        }
        actions={
          <Button variant="outline" icon={Settings} onClick={() => setSettingsOpen(true)}>
            Programme settings
          </Button>
        }
      />

      <div className="mb-5">
        <PillTabs<Tab>
          tabs={[
            { id: 'pending', label: 'Pending', count: pendingCount },
            { id: 'all', label: 'All sales' },
            { id: 'referrers', label: 'Referrers', count: referrers.length },
          ]}
          active={tab}
          onSelect={setTab}
        />
      </div>

      {tab === 'referrers' ? (
        <DataTable
          rows={referrers}
          columns={referrerColumns}
          rowKey={r => r.userId}
          loading={loading}
          initialSort={{ id: 'earned', dir: 'desc' }}
          empty={{
            icon: Trophy,
            title: error ? 'Could not load referrers' : 'No one has shared yet',
            description: error ?? 'Customers who share a product link will appear here.',
          }}
        />
      ) : (
        <DataTable
          rows={purchases}
          columns={purchaseColumns}
          rowKey={p => p.id}
          loading={loading}
          initialSort={{ id: 'order', dir: 'desc' }}
          rowActions={p =>
            isPendingReferral(p) ? (
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" icon={Close} onClick={() => reject(p)}>
                  Reject
                </Button>
                <Button size="sm" variant="primary" icon={Check} onClick={() => setApproving(p)}>
                  Pay
                </Button>
              </div>
            ) : null
          }
          empty={{
            icon: NavUsers,
            title: error
              ? 'Could not load referrals'
              : tab === 'pending'
                ? 'No commissions waiting'
                : 'No referred sales yet',
            description: error ?? 'Purchases made through a share link appear here for approval.',
          }}
        />
      )}

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
    </PageBody>
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
      title="Refer & earn"
      description="The store-wide programme settings."
      icon={Share}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Switch
          label="Programme active"
          description="When off, no new referral earnings are recorded."
          checked={enabled}
          onChange={setEnabled}
        />
        <Input
          label="Default commission"
          type="number"
          hint="%"
          value={percentage}
          onChange={e => setPercentage(e.target.value)}
          placeholder="5"
        />
        <NoteBox>
          {enabled
            ? 'New referred sales suggest this % of the product subtotal (before GST and delivery). You can still change the amount on each sale before approving.'
            : 'Turned off: no new referral earnings are recorded and the app stops advertising a commission. Sales already pending stay approvable.'}
        </NoteBox>
      </div>
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
  const payout = (): number => {
    const flat = Number.parseFloat(fixed.trim());
    if (Number.isFinite(flat) && flat > 0) return flat;
    const pct = Number.parseFloat(percentage.trim()) || 0;
    return (purchase.purchaseAmount * pct) / 100;
  };

  const amount = payout();

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
    <div className="flex items-baseline justify-between gap-6 border-b border-border py-2 last:border-0">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );

  return (
    <Modal
      title="Pay commission"
      description={`To ${purchase.referrerName}.`}
      icon={Share}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={amount <= 0} onClick={submit}>
            Approve &amp; pay {money(amount)}
          </Button>
        </>
      }
    >
      <div className="mb-5">
        <SectionHeading title="The sale" />
        {row('Bought by', purchase.referredUserName ?? '—')}
        {purchase.productName && row('Product', purchase.productName)}
        {row('Order', purchase.orderNumber ?? purchase.orderId)}
        {row('Order value', money(purchase.purchaseAmount))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Commission"
          type="number"
          hint="%"
          value={percentage}
          onChange={e => setPercentage(e.target.value)}
        />
        <Input
          label="Or a fixed amount"
          type="number"
          hint="₹"
          value={fixed}
          onChange={e => setFixed(e.target.value)}
          description="Overrides the percentage."
        />
      </div>

      <div className="mt-4">
        <NoteBox>
          {money(amount)} will be credited to {purchase.referrerName}&apos;s wallet straight away.
        </NoteBox>
      </div>
    </Modal>
  );
}
