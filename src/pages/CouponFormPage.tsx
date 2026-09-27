/**
 * Create / edit a coupon — a port of
 * dristi-admin-app/lib/screens/coupon_form_screen.dart.
 * The code is upper-cased on save, as the Flutter form does.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { useToast } from '../context/AdminContext';
import { FormBody, PageHeader, StickyActions } from '../components/AdminShell';
import { Button, Card, CardContent, CardHeader, Input, Select, Switch } from '../components/primitives';
import { BrandLoader } from '../components/ui';
import type { DetailPageProps } from './types';

export function CouponFormPage({ couponId, onBack }: DetailPageProps & { couponId: string | null }) {
  const isEdit = couponId !== null;
  const toast = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [expiry, setExpiry] = useState('');
  const [usageLimit, setUsageLimit] = useState('100');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!couponId) return;
    let live = true;
    setLoading(true);
    api
      .getCoupon(couponId)
      .then(c => {
        if (!live) return;
        setCode(c.code);
        setValue(String(c.value));
        if (c.minOrderAmount != null) setMinOrder(String(c.minOrderAmount));
        if (c.maxDiscount != null) setMaxDiscount(String(c.maxDiscount));
        setExpiry(c.expiryDate ?? '');
        setUsageLimit(String(c.usageLimit));
        setType(c.type);
        setActive(c.isActive);
      })
      .catch(e => toast(errorMessage(e), { error: true }))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [couponId, toast]);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!code.trim()) next.code = 'Required';
    if (!value.trim()) next.value = 'Required';
    else if (!Number.isFinite(Number.parseFloat(value.trim()))) next.value = 'Enter a number';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body: Record<string, unknown> = {
      code: code.trim().toUpperCase(),
      type,
      value: Number.parseFloat(value.trim()),
      usage_limit: Number.parseInt(usageLimit.trim(), 10) || 100,
      is_active: active,
    };
    if (minOrder.trim()) body.min_order_amount = Number.parseFloat(minOrder.trim()) || 0;
    if (maxDiscount.trim()) body.max_discount = Number.parseFloat(maxDiscount.trim()) || 0;
    if (expiry.trim()) body.expiry_date = expiry.trim();

    setSaving(true);
    try {
      if (couponId) await api.updateCoupon(couponId, body);
      else await api.createCoupon(body);
      toast(couponId ? 'Coupon updated' : 'Coupon created', { success: true });
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
        title={isEdit ? 'Edit coupon' : 'New coupon'}
        description="Discount codes customers can apply at checkout."
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
        }
      />

      <div className="space-y-5">
        <Card>
          <CardHeader title="Discount" description="What the code is worth and how it applies." />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Code"
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              error={errors.code}
              placeholder="FESTIVE20"
              description="Saved in upper case."
              className="font-mono uppercase"
            />
            <Select
              label="Type"
              value={type}
              onChange={e => setType(e.target.value)}
              options={[
                { value: 'percentage', label: 'Percentage off' },
                { value: 'fixed', label: 'Fixed amount off' },
              ]}
            />
            <Input
              label="Value"
              required
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              error={errors.value}
              hint={type === 'percentage' ? '%' : '₹'}
              placeholder={type === 'percentage' ? '10' : '50'}
            />
            <Input
              label="Maximum discount"
              type="number"
              value={maxDiscount}
              onChange={e => setMaxDiscount(e.target.value)}
              hint="₹"
              description="Caps a percentage discount. Leave blank for no cap."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Limits" description="When and how often the code can be used." />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Minimum order"
              type="number"
              value={minOrder}
              onChange={e => setMinOrder(e.target.value)}
              hint="₹"
              description="Subtotal the code needs to unlock."
            />
            <Input
              label="Usage limit"
              type="number"
              value={usageLimit}
              onChange={e => setUsageLimit(e.target.value)}
              description="Total redemptions allowed."
            />
            <Input
              label="Expires"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              placeholder="2026-12-31T23:59:59"
              description="ISO timestamp. Leave blank for no expiry."
              className="sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <Switch
                label="Active"
                description="Inactive codes are rejected at checkout but keep their history."
                checked={active}
                onChange={setActive}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <StickyActions>
        <Button variant="ghost" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} loading={saving}>
          {isEdit ? 'Save changes' : 'Create coupon'}
        </Button>
      </StickyActions>
    </FormBody>
  );
}
