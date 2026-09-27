/**
 * Create / edit a payment method — a port of
 * dristi-admin-app/lib/screens/payment_method_form_screen.dart.
 *
 * `gateway` is which provider settles the method and `regions` where it is
 * offered — both admin configuration, never shown to buyers.
 */
import { useEffect, useState } from 'react';
import { Wallet } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { capitalise } from '../lib/format';
import { GATEWAY_OPTIONS } from '../types';
import { useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  FormSection,
  HelpBox,
  PageHeader,
  PrimaryButton,
  Select,
  TextInput,
  ToggleRow,
} from '../components/ui';
import type { DetailPageProps } from './types';

export function PaymentMethodFormPage({
  methodId,
  onBack,
}: DetailPageProps & { methodId: string | null }) {
  const isEdit = methodId !== null;
  const toast = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [gateway, setGateway] = useState('cashfree');
  const [regions, setRegions] = useState('*');
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!methodId) return;
    let live = true;
    setLoading(true);
    api
      .getPaymentMethod(methodId)
      .then(m => {
        if (!live) return;
        setCode(m.code);
        setName(m.name);
        setDescription(m.description ?? '');
        setIconUrl(m.iconUrl ?? '');
        setRegions(m.regions);
        setSortOrder(String(m.sortOrder));
        setGateway(m.gateway);
        setActive(m.isActive);
      })
      .catch(e => toast(errorMessage(e), { error: true }))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [methodId, toast]);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Required';
    if (!code.trim()) next.code = 'Required';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body: Record<string, unknown> = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      icon_url: iconUrl.trim() || null,
      gateway,
      regions: regions.trim() || '*',
      sort_order: Number.parseInt(sortOrder.trim(), 10) || 0,
      is_active: active,
    };

    setSaving(true);
    try {
      if (methodId) await api.updatePaymentMethod(methodId, body);
      else await api.createPaymentMethod(body);
      toast(methodId ? 'Payment method updated' : 'Payment method created', { success: true });
      onBack();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title={isEdit ? 'Edit Payment Method' : 'New Payment Method'} onBack={onBack} />
        <BrandLoader />
      </>
    );
  }

  return (
    <>
      <PageHeader title={isEdit ? 'Edit Payment Method' : 'New Payment Method'} onBack={onBack} />
      <PageBody className="space-y-4">
        <FormSection title="What the customer sees">
          <TextInput label="Display Name" value={name} onChange={setName} required hint="e.g. UPI" error={errors.name} />
          <TextInput
            label="Description"
            value={description}
            onChange={setDescription}
            hint="e.g. Pay using any UPI app"
          />
          <TextInput
            label="Icon URL"
            value={iconUrl}
            onChange={setIconUrl}
            hint="Optional — a built-in icon is used when empty"
          />
        </FormSection>

        <FormSection title="Configuration">
          <div className="mb-3">
            <HelpBox
              lines={[
                "Code must match the gateway's own method name — upi, card, netbanking or wallet. It opens the checkout on that method.",
                'Regions: comma-separated country codes (IN, or IN,AE), or * for everywhere. UPI is India-only.',
                'Lower sort order appears first at checkout.',
              ]}
            />
          </div>
          <TextInput
            label="Code"
            value={code}
            onChange={setCode}
            required
            hint="upi / card / netbanking / wallet"
            error={errors.code}
          />
          <Select
            label="Gateway"
            value={gateway}
            options={GATEWAY_OPTIONS.map(g => ({ value: g, label: capitalise(g) }))}
            onChange={setGateway}
          />
          <TextInput label="Regions" value={regions} onChange={setRegions} hint="* or IN,AE" />
          <TextInput label="Sort Order" value={sortOrder} onChange={setSortOrder} number hint="0 = first" />
          <ToggleRow label="Active" value={active} onChange={setActive} />
        </FormSection>

        <div className="pt-4">
          <PrimaryButton
            label={isEdit ? 'Update Method' : 'Create Method'}
            loading={saving}
            onClick={save}
            icon={Wallet}
          />
        </div>
      </PageBody>
    </>
  );
}
