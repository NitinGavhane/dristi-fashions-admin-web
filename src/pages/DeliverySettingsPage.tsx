/**
 * Store-wide delivery charge — a port of
 * dristi-admin-app/lib/screens/delivery_settings_screen.dart.
 *
 * Two behaviours are load-bearing and carried over verbatim:
 *  • The toggle is the seller's decision and the ONLY thing that decides
 *    `enabled`. Deriving it from the fee box made it impossible to switch
 *    delivery off without first clearing the amount.
 *  • A state field is pre-filled only with an amount the seller actually saved
 *    before, so a fresh save keeps delivery a single flat charge rather than
 *    silently switching the store to distance-based pricing.
 */
import { useEffect, useMemo, useState } from 'react';
import { Settings } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { trimAmount } from '../lib/format';
import { useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import { BrandLoader, FormSection, NoteBox, PageHeader, PrimaryButton, TextInput, ToggleRow } from '../components/ui';
import type { PageProps } from './types';

/**
 * The Indian states & union territories a buyer can set as their delivery state.
 * A fee entered here overrides the default for that destination; leaving one
 * blank means that state pays the default fee.
 */
export const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

/**
 * Matches the backend's default per-state map (delivery priced by distance from
 * the seller in West Bengal). Since billing only needs the best match, "Jammu &
 * Kashmir" here also covers the "and" spelling on addresses.
 */
const DEFAULT_STATE_FEES: Record<string, number> = {
  'West Bengal': 49,
  Bihar: 49,
  Jharkhand: 49,
  Odisha: 49,
  Sikkim: 49,
  Assam: 59,
  'Arunachal Pradesh': 59,
  Meghalaya: 59,
  Manipur: 59,
  Mizoram: 59,
  Nagaland: 59,
  Tripura: 59,
  Chhattisgarh: 69,
  'Madhya Pradesh': 69,
  'Uttar Pradesh': 69,
  Uttarakhand: 69,
  Rajasthan: 79,
  Delhi: 79,
  Haryana: 79,
  Punjab: 79,
  'Himachal Pradesh': 79,
  Chandigarh: 79,
  'Jammu & Kashmir': 99,
  'Jammu and Kashmir': 99,
  Ladakh: 99,
  Maharashtra: 79,
  Gujarat: 79,
  Goa: 89,
  Karnataka: 89,
  Telangana: 89,
  'Andhra Pradesh': 89,
  'Tamil Nadu': 89,
  Kerala: 89,
  Puducherry: 89,
};

export function DeliverySettingsPage({ onMenu }: PageProps) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [fee, setFee] = useState('');
  const [freeAbove, setFreeAbove] = useState('');
  const [stateFees, setStateFees] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    api
      .getDeliverySettings()
      .then(s => {
        if (!live) return;
        // Show exactly what is saved. A store that has switched delivery off must
        // come back switched off. The ₹50 starting point for a brand-new store is
        // the backend's job (delivery_service.get_settings seeds the row with it);
        // the fee box falls back to its "e.g. 50" hint when there is nothing.
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

  /** Plain-language summary of what buyers will be charged, unsaved values included. */
  const rulePreview = useMemo(() => {
    const feeValue = Number.parseFloat(fee.trim()) || 0;
    const freeValue = Number.parseFloat(freeAbove.trim());
    const explicitStates = Object.values(stateFees).filter(v => v.trim() !== '').length;

    if (!enabled || feeValue <= 0) return 'Delivery is FREE on every order.';

    const freeNote =
      Number.isFinite(freeValue) && freeValue > 0
        ? ` FREE when the order subtotal reaches ₹${trimAmount(freeValue)}.`
        : '';

    if (explicitStates > 0) {
      return `Delivery costs ₹${trimAmount(feeValue)} by default, with ${explicitStates} states priced separately by distance.${freeNote}`;
    }
    return `Delivery costs ₹${trimAmount(feeValue)} on every order.${freeNote}`;
  }, [enabled, fee, freeAbove, stateFees]);

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

  return (
    <>
      <PageHeader title="Delivery" subtitle="Charge settings" onMenu={onMenu} />
      <PageBody className="space-y-5">
        {loading ? (
          <BrandLoader />
        ) : (
          <>
            <FormSection title="Delivery Charge">
              <ToggleRow
                label="Charge for delivery"
                value={enabled}
                onChange={next => {
                  setEnabled(next);
                  // Switching charging on with no amount yet offers the ₹50 house
                  // default, so the common case stays one tap. Switching it off
                  // leaves the amount alone, ready for whenever it comes back on.
                  if (next && fee.trim() === '') setFee('50');
                }}
              />
              <div className="mt-3.5">
                <TextInput
                  label="Default Delivery Fee (₹)"
                  value={fee}
                  onChange={setFee}
                  number
                  hint="e.g. 50 — used for any state not priced below"
                />
                <TextInput
                  label="Free delivery above (₹)"
                  value={freeAbove}
                  onChange={setFreeAbove}
                  number
                  hint="Optional — leave blank for none"
                />
              </div>
              <NoteBox>{rulePreview}</NoteBox>
            </FormSection>

            <FormSection title="State-wise Charges (Optional)">
              <p className="mb-3 text-xs leading-relaxed text-ink-soft">
                Optional. By default every customer pays the single delivery charge above. Only fill these in if you
                want to charge some states differently by distance — a state left blank keeps the default fee.
              </p>
              <div className="grid gap-x-4 sm:grid-cols-2">
                {INDIA_STATES.map(state => (
                  <TextInput
                    key={state}
                    label={state}
                    value={stateFees[state] ?? ''}
                    onChange={value => setStateFees(m => ({ ...m, [state]: value }))}
                    number
                    hint={`Default ₹${trimAmount(DEFAULT_STATE_FEES[state] ?? 0)}`}
                  />
                ))}
              </div>
            </FormSection>

            <PrimaryButton
              label="Save Settings"
              loading={saving}
              onClick={save}
              icon={Settings}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
