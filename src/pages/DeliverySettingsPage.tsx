/**
 * Store-wide delivery charge — a port of
 * dristi-admin-app/lib/screens/delivery_settings_screen.dart.
 *
 * Two behaviours are load-bearing and carried over verbatim:
 *  • The toggle is the only thing that decides `enabled`. Deriving it from the
 *    fee box made it impossible to switch delivery off without first clearing
 *    the amount.
 *  • A state fee is pre-filled only when the seller actually saved one before,
 *    so a fresh save keeps delivery a single flat charge rather than silently
 *    switching the store to distance-based pricing.
 */
import { useEffect, useMemo, useState } from 'react';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { trimAmount } from '../lib/format';
import { useToast } from '../context/AdminContext';
import { FormBody, PageHeader, StickyActions } from '../components/AdminShell';
import { Button, Card, CardContent, CardHeader, Input, Switch } from '../components/primitives';
import { BrandLoader, NoteBox, SearchInput } from '../components/ui';
import type { PageProps } from './types';

/**
 * The Indian states and union territories a buyer can set as their delivery
 * state. A fee entered here overrides the default for that destination.
 */
export const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh',
  'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;

/**
 * The backend's default per-state map (delivery priced by distance from the
 * seller in West Bengal). Billing only needs the best match, so "Jammu &
 * Kashmir" here also covers the "and" spelling on addresses.
 */
const DEFAULT_STATE_FEES: Record<string, number> = {
  'West Bengal': 49, Bihar: 49, Jharkhand: 49, Odisha: 49, Sikkim: 49,
  Assam: 59, 'Arunachal Pradesh': 59, Meghalaya: 59, Manipur: 59, Mizoram: 59,
  Nagaland: 59, Tripura: 59,
  Chhattisgarh: 69, 'Madhya Pradesh': 69, 'Uttar Pradesh': 69, Uttarakhand: 69,
  Rajasthan: 79, Delhi: 79, Haryana: 79, Punjab: 79, 'Himachal Pradesh': 79, Chandigarh: 79,
  'Jammu & Kashmir': 99, 'Jammu and Kashmir': 99, Ladakh: 99,
  Maharashtra: 79, Gujarat: 79,
  Goa: 89, Karnataka: 89, Telangana: 89, 'Andhra Pradesh': 89, 'Tamil Nadu': 89,
  Kerala: 89, Puducherry: 89,
};

export function DeliverySettingsPage(_: PageProps) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [fee, setFee] = useState('');
  const [freeAbove, setFreeAbove] = useState('');
  const [stateFees, setStateFees] = useState<Record<string, string>>({});
  const [stateQuery, setStateQuery] = useState('');

  useEffect(() => {
    let live = true;
    api
      .getDeliverySettings()
      .then(s => {
        if (!live) return;
        // Show exactly what is saved. A store that switched delivery off must
        // come back switched off.
        setEnabled(s.enabled);
        setFee(s.fee > 0 ? trimAmount(s.fee) : '');
        if (s.freeAbove != null) setFreeAbove(trimAmount(s.freeAbove));

        const saved = s.stateFees ?? {};
        setStateFees(
          Object.fromEntries(
            Object.entries(saved)
              .filter(([state]) => (INDIA_STATES as readonly string[]).includes(state))
              .map(([state, value]) => [state, trimAmount(value)]),
          ),
        );
      })
      .catch(e => toast(errorMessage(e), { error: true }))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [toast]);

  const overrideCount = Object.values(stateFees).filter(v => v.trim() !== '').length;

  /** Plain-language summary of what buyers will be charged, unsaved values included. */
  const rulePreview = useMemo(() => {
    const feeValue = Number.parseFloat(fee.trim()) || 0;
    const freeValue = Number.parseFloat(freeAbove.trim());

    if (!enabled || feeValue <= 0) return 'Delivery is free on every order.';

    const freeNote =
      Number.isFinite(freeValue) && freeValue > 0
        ? ` Free once the order subtotal reaches ₹${trimAmount(freeValue)}.`
        : '';

    if (overrideCount > 0) {
      return `Delivery costs ₹${trimAmount(feeValue)} by default, with ${overrideCount} state${overrideCount === 1 ? '' : 's'} priced separately.${freeNote}`;
    }
    return `Delivery costs ₹${trimAmount(feeValue)} on every order.${freeNote}`;
  }, [enabled, fee, freeAbove, overrideCount]);

  const visibleStates = useMemo(() => {
    const q = stateQuery.trim().toLowerCase();
    if (!q) return INDIA_STATES as readonly string[];
    return (INDIA_STATES as readonly string[]).filter(s => s.toLowerCase().includes(q));
  }, [stateQuery]);

  const save = async () => {
    setSaving(true);
    const feeValue = Number.parseFloat(fee.trim()) || 0;
    const freeText = freeAbove.trim();
    const freeValue = freeText === '' ? null : Number.parseFloat(freeText) || 0;

    // Only non-blank states are written; blank ones fall back to the default.
    const fees: Record<string, number> = {};
    for (const [state, value] of Object.entries(stateFees)) {
      if (value.trim() !== '') fees[state] = Number.parseFloat(value.trim()) || 0;
    }

    try {
      await api.updateDeliverySettings({
        enabled,
        fee: feeValue,
        state_fees: fees,
        free_above: freeValue,
      });
      toast('Delivery settings saved', { success: true });
    } catch (e) {
      toast(`Save failed: ${errorMessage(e)}`, { error: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <BrandLoader />;

  return (
    <FormBody>
      <PageHeader
        title="Delivery settings"
        description="What customers are charged to have an order shipped."
      />

      <div className="space-y-5">
        <Card>
          <CardHeader title="Delivery charge" />
          <CardContent className="space-y-4">
            <Switch
              label="Charge for delivery"
              description="Off means every order ships free, whatever the amounts below say."
              checked={enabled}
              onChange={next => {
                setEnabled(next);
                // Switching charging on with no amount yet offers the ₹50 house
                // default, so the common case stays one click.
                if (next && fee.trim() === '') setFee('50');
              }}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Default fee"
                type="number"
                hint="₹"
                value={fee}
                onChange={e => setFee(e.target.value)}
                placeholder="50"
                description="Charged for any state not priced below."
                disabled={!enabled}
              />
              <Input
                label="Free above"
                type="number"
                hint="₹"
                value={freeAbove}
                onChange={e => setFreeAbove(e.target.value)}
                description="Subtotal at which delivery becomes free. Blank for never."
                disabled={!enabled}
              />
            </div>

            <NoteBox>{rulePreview}</NoteBox>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="State-wise overrides"
            description="Optional. A state left blank pays the default fee."
            actions={
              overrideCount > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStateFees({})}
                  disabled={!enabled}
                >
                  Clear all ({overrideCount})
                </Button>
              ) : undefined
            }
          />
          <CardContent className="space-y-4">
            <SearchInput
              hint="Find a state..."
              value={stateQuery}
              onChange={setStateQuery}
              className="w-full sm:w-64"
            />

            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleStates.map(state => (
                <Input
                  key={state}
                  label={state}
                  type="number"
                  hint="₹"
                  value={stateFees[state] ?? ''}
                  onChange={e => setStateFees(m => ({ ...m, [state]: e.target.value }))}
                  placeholder={String(DEFAULT_STATE_FEES[state] ?? 0)}
                  disabled={!enabled}
                />
              ))}
            </div>

            {visibleStates.length === 0 && (
              <p className="py-4 text-center text-[13px] text-muted-foreground">
                No state matches “{stateQuery}”.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <StickyActions>
        <Button variant="primary" onClick={save} loading={saving}>
          Save settings
        </Button>
      </StickyActions>
    </FormBody>
  );
}
