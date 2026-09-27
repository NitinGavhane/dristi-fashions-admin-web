/**
 * Create / edit a coupon — a port of
 * dristi-admin-app/lib/screens/coupon_form_screen.dart.
 * The code is upper-cased on save, as the Flutter form does.
 */
import { useEffect, useState } from 'react';
import { Gift } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  FormSection,
  PageHeader,
  PrimaryButton,
  Select,
  TextInput,
  ToggleRow,
} from '../components/ui';
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

  if (loading) {
    return (
      <>
        <PageHeader title={isEdit ? 'Edit Coupon' : 'New Coupon'} onBack={onBack} />
        <BrandLoader />
      </>
    );
  }

  return (
    <>
      <PageHeader title={isEdit ? 'Edit Coupon' : 'New Coupon'} onBack={onBack} />
      <PageBody className="space-y-4">
        <FormSection title="Coupon Details">
          <TextInput label="Coupon Code" value={code} onChange={setCode} required error={errors.code} />
          <Select
            label="Type"
            value={type}
            options={[
              { value: 'percentage', label: 'Percentage' },
              { value: 'fixed', label: 'Fixed' },
            ]}
            onChange={setType}
          />
          <TextInput
            label="Value"
            value={value}
            onChange={setValue}
            number
            required
            error={errors.value}
            hint={type === 'percentage' ? 'e.g. 10' : 'e.g. 50'}
          />
          <div className="grid gap-x-3 sm:grid-cols-2">
            <TextInput label="Min Order" value={minOrder} onChange={setMinOrder} number />
            <TextInput label="Max Discount" value={maxDiscount} onChange={setMaxDiscount} number />
          </div>
        </FormSection>

        <FormSection title="Limits">
          <TextInput label="Expiry" value={expiry} onChange={setExpiry} hint="2026-12-31T23:59:59" />
          <TextInput label="Usage Limit" value={usageLimit} onChange={setUsageLimit} number />
          <ToggleRow label="Active" value={active} onChange={setActive} />
        </FormSection>

        <div className="pt-4">
          <PrimaryButton
            label={isEdit ? 'Update Coupon' : 'Create Coupon'}
            loading={saving}
            onClick={save}
            icon={Gift}
          />
        </div>
      </PageBody>
    </>
  );
}
