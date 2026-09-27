/**
 * Create / edit a payment method — a port of
 * dristi-admin-app/lib/screens/payment_method_form_screen.dart.
 *
 * `gateway` is which provider settles the method and `regions` where it is
 * offered — both admin configuration, never shown to buyers.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { capitalise } from '../lib/format';
import { GATEWAY_OPTIONS } from '../types';
import { useToast } from '../context/AdminContext';
import { FormBody, PageHeader, StickyActions } from '../components/AdminShell';
import { Button, Card, CardContent, CardHeader, Input, Select, Switch } from '../components/primitives';
import { BrandLoader, HelpBox } from '../components/ui';
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

  if (loading) return <BrandLoader />;

  return (
    <FormBody>
      <PageHeader
        title={isEdit ? 'Edit payment method' : 'New payment method'}
        description="What buyers can pay with, and how it settles."
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
        }
      />

      <div className="space-y-5">
        <Card>
          <CardHeader title="What the customer sees" description="Shown on the checkout screen." />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Display name"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              error={errors.name}
              placeholder="UPI"
            />
            <Input
              label="Icon URL"
              value={iconUrl}
              onChange={e => setIconUrl(e.target.value)}
              description="Optional — a built-in icon is used when empty."
            />
            <Input
              label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Pay using any UPI app"
              className="sm:col-span-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Configuration" description="How the gateway is told to open checkout." />
          <CardContent className="space-y-4">
            <HelpBox
              lines={[
                "Code must match the gateway's own method name — upi, card, netbanking or wallet. It opens the checkout on that method.",
                'Regions: comma-separated country codes (IN, or IN,AE), or * for everywhere. UPI is India-only.',
                'Lower sort order appears first at checkout.',
              ]}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Code"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                error={errors.code}
                placeholder="upi"
                className="font-mono"
              />
              <Select
                label="Gateway"
                value={gateway}
                onChange={e => setGateway(e.target.value)}
                options={GATEWAY_OPTIONS.map(g => ({ value: g, label: capitalise(g) }))}
              />
              <Input
                label="Regions"
                value={regions}
                onChange={e => setRegions(e.target.value)}
                placeholder="* or IN,AE"
              />
              <Input
                label="Sort order"
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                description="0 shows first."
              />
            </div>

            <Switch
              label="Active"
              description="Inactive methods are hidden at checkout without being deleted."
              checked={active}
              onChange={setActive}
            />
          </CardContent>
        </Card>
      </div>

      <StickyActions>
        <Button variant="ghost" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} loading={saving}>
          {isEdit ? 'Save changes' : 'Create method'}
        </Button>
      </StickyActions>
    </FormBody>
  );
}
