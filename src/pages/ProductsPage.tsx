/**
 * Catalogue list — a port of dristi-admin-app/lib/screens/products_screen.dart.
 *
 * The gender chip is a server-side filter (it re-queries with `?gender=`) and
 * also filters locally, exactly as the Flutter screen does; the search box is
 * debounced client-side over title and SKU.
 */
import { useEffect, useMemo, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import * as api from '../lib/api';
import { capitalise, imageUrl, money } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { errorMessage } from '../lib/apiClient';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  DeleteButton,
  EditButton,
  EmptyBox,
  FilterChips,
  FloatingAction,
  ListCard,
  PageHeader,
  SafeImage,
  SearchInput,
  Tag,
} from '../components/ui';
import type { PageProps } from './types';

const GENDER_FILTERS = [
  { value: '', label: 'All' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'kids', label: 'Kids' },
];

export function ProductsPage({ onNavigate, onMenu }: PageProps) {
  const [gender, setGender] = useState('');
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const confirm = useConfirm();
  const toast = useToast();

  const { data, loading, error, reload } = useAsync(
    () => api.getProducts({ gender: gender || undefined }),
    [gender],
  );

  // 250ms debounce, matching the Flutter screen's Timer.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(rawQuery), 250);
    return () => window.clearTimeout(t);
  }, [rawQuery]);

  const products = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (q && !p.title.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      if (gender && (p.gender ?? '').toLowerCase() !== gender) return false;
      return true;
    });
  }, [products, query, gender]);

  const remove = async (id: string, title: string) => {
    const ok = await confirm({ message: `Remove "${title}"?` });
    if (!ok) return;
    try {
      await api.deleteProduct(id);
      toast('Product removed', { success: true });
      reload();
    } catch (e) {
      toast(errorMessage(e), { error: true });
    }
  };

  return (
    <>
      <PageHeader title="Products" subtitle={`${products.length} ITEMS`} onMenu={onMenu} />
      <PageBody>
        <SearchInput hint="SEARCH PRODUCTS" value={rawQuery} onChange={setRawQuery} />
        <div className="mt-3">
          <FilterChips options={GENDER_FILTERS} active={gender} onSelect={setGender} />
        </div>

        <div className="mt-3 space-y-2.5">
          {loading ? (
            <BrandLoader />
          ) : error ? (
            <EmptyBox icon={Package} message={error} />
          ) : filtered.length === 0 ? (
            <EmptyBox icon={Package} message="No products yet" />
          ) : (
            filtered.map(p => (
              <ListCard key={p.id}>
                <div className="flex items-start gap-3.5">
                  <SafeImage
                    src={imageUrl(p.primaryImage)}
                    alt=""
                    className="size-[60px] shrink-0 rounded-input border border-hair object-cover"
                    fallback={<Package size={24} />}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{p.title}</p>
                    <span className="mt-1 inline-block rounded border border-hair bg-bg-alt px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.8px] text-muted">
                      SKU: {p.sku}
                    </span>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      {p.discountPrice != null ? (
                        <>
                          <span className="text-base font-black text-coral">{money(p.discountPrice)}</span>
                          <span className="text-xs text-muted line-through">{money(p.price)}</span>
                        </>
                      ) : (
                        <span className="text-base font-black text-coral">{money(p.price)}</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.featured && <Tag text="Featured" color="var(--color-gold)" filled />}
                      {p.gender && <Tag text={capitalise(p.gender)} color="var(--color-coral)" />}
                      {p.isReplaceable && <Tag text="Replace" color="var(--color-coral)" />}
                      {p.isReturnable && <Tag text="Return" color="var(--color-coral)" />}
                      {!p.isActive && <Tag text="Inactive" color="var(--color-error)" filled />}
                      {p.categoryName && <Tag text={p.categoryName} color="var(--color-muted)" />}
                      <Tag
                        text={`Stock: ${p.stock}`}
                        color={p.stock > 5 ? 'var(--color-success)' : 'var(--color-error)'}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <EditButton onClick={() => onNavigate(`/products/${p.id}`)} label={`Edit ${p.title}`} />
                    <DeleteButton onClick={() => remove(p.id, p.title)} label={`Delete ${p.title}`} />
                  </div>
                </div>
              </ListCard>
            ))
          )}
        </div>
      </PageBody>
      <FloatingAction onClick={() => onNavigate('/products/new')} label="Add product" icon={Plus} />
    </>
  );
}
