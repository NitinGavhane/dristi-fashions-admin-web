/**
 * Category tree — a port of dristi-admin-app/lib/screens/categories_screen.dart.
 *
 * With no filter the list is grouped Men / Women / Kids, then "Other" (unisex
 * and ungendered parents), then "Ungrouped" for anything that resolves to no
 * gender at all. The gender of a category is resolved the way the backend does:
 * its own gender if it is a real one, otherwise the parent's.
 */
import { useMemo, useState } from 'react';
import { Indent, NavCategories, Plus } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { capitalise, imageUrl } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { MAIN_CATEGORY_NAMES, SPECIFIC_GENDERS, isMainCategoryName, isParentCategory, type AdminCategory } from '../types';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  DeleteButton,
  EditButton,
  EmptyBox,
  FilterChips,
  FloatingAction,
  PageHeader,
  SafeImage,
} from '../components/ui';
import type { PageProps } from './types';

const GENDER_FILTERS = [
  { value: '', label: 'All' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'kids', label: 'Kids' },
];

/** `_genderFor` — an explicit real gender wins, else inherit from the parent. */
function genderFor(cat: AdminCategory, all: AdminCategory[]): string {
  const own = cat.gender?.toLowerCase() ?? '';
  if ((SPECIFIC_GENDERS as readonly string[]).includes(own)) return own;

  if (cat.parentId) {
    const parent = all.find(c => c.id === cat.parentId);
    if (parent) {
      const pg = parent.gender?.toLowerCase() ?? '';
      if ((SPECIFIC_GENDERS as readonly string[]).includes(pg)) return pg;
      if (isMainCategoryName(parent.name)) return parent.name.toLowerCase();
    }
  }
  return own;
}

export function CategoriesPage({ onNavigate, onMenu }: PageProps) {
  const [genderFilter, setGenderFilter] = useState('');
  const confirm = useConfirm();
  const toast = useToast();

  const { data, loading, error, reload } = useAsync(
    () => api.getCategories({ gender: genderFilter || undefined }),
    [genderFilter],
  );

  const categories = data ?? [];

  const groups = useMemo(() => {
    const parents = categories.filter(isParentCategory);
    const childrenOf = (id: string) => categories.filter(c => c.parentId === id);

    const genderParents = parents.filter(c => isMainCategoryName(c.name));
    const otherParents = parents.filter(c => !isMainCategoryName(c.name) && genderFor(c, categories) === '');
    const forGender = (gender: string) =>
      categories.filter(c => genderFor(c, categories) === gender && !isMainCategoryName(c.name));
    const orphans = categories.filter(c => genderFor(c, categories) === '' && !isMainCategoryName(c.name));

    return { childrenOf, genderParents, otherParents, forGender, orphans };
  }, [categories]);

  const remove = async (cat: AdminCategory) => {
    const children = groups.childrenOf(cat.id);
    const ok = await confirm({
      message: `Remove "${cat.name}"?${children.length > 0 ? '\nSubcategories will also be removed.' : ''}`,
    });
    if (!ok) return;
    try {
      await api.deleteCategory(cat.id);
      toast('Category removed', { success: true });
      reload();
    } catch (e) {
      toast(`Delete failed: ${errorMessage(e)}`, { error: true });
    }
  };

  const renderCard = (cat: AdminCategory) => {
    const parent = isParentCategory(cat);
    const children = parent ? groups.childrenOf(cat.id) : [];
    const accent = cat.isActive ? 'var(--color-accent)' : 'var(--color-muted)';

    const meta = [
      parent ? 'PARENT' : 'SUBCATEGORY',
      cat.gender ? capitalise(cat.gender) : null,
      children.length > 0 ? `${children.length} SUBCATEGORIES` : null,
      !cat.isActive ? 'INACTIVE' : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <div
        key={cat.id}
        className="bg-white/[0.02] mb-2 rounded-2xl border p-4 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.85)]"
        style={{
          marginLeft: parent ? 0 : 20,
          borderColor: parent ? 'color-mix(in srgb, var(--color-accent) 25%, transparent)' : 'var(--color-hair)',
        }}
      >
        <div className="flex items-center gap-3.5">
          {!parent && (
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted/10 text-muted">
              <Indent size={14} />
            </span>
          )}
          {cat.imageUrl ? (
            <SafeImage
              src={imageUrl(cat.imageUrl)}
              alt=""
              className="size-[46px] shrink-0 rounded-2xl border object-cover"
              fallback={<span className="text-xl font-black">{cat.name[0]?.toUpperCase() ?? '?'}</span>}
            />
          ) : (
            <span
              className="grid size-[46px] shrink-0 place-items-center rounded-2xl border text-xl font-black"
              style={{
                color: accent,
                borderColor: cat.isActive
                  ? 'color-mix(in srgb, var(--color-accent) 20%, transparent)'
                  : 'var(--color-hair)',
                backgroundColor: cat.isActive
                  ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                  : 'var(--color-raised)',
              }}
            >
              {cat.name[0]?.toUpperCase() ?? '?'}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-[0.5px] text-ink">{cat.name}</p>
            <span
              className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                color: cat.isActive ? 'var(--color-muted)' : 'var(--color-error)',
                backgroundColor: cat.isActive
                  ? 'var(--color-raised)'
                  : 'color-mix(in srgb, var(--color-error) 8%, transparent)',
              }}
            >
              {meta}
            </span>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <EditButton onClick={() => onNavigate(`/categories/${cat.id}`)} label={`Edit ${cat.name}`} />
            <DeleteButton onClick={() => remove(cat)} label={`Delete ${cat.name}`} />
          </div>
        </div>
      </div>
    );
  };

  const groupHeading = (text: string) => (
    <div className="flex items-center gap-2 pb-2.5 pt-3">
      <span className="block h-0.5 w-4 rounded-sm bg-gradient-to-r from-accent to-accent-bright" />
      <span className="label-caps text-[10px] font-extrabold tracking-[3px] text-muted">{text}</span>
    </div>
  );

  const body = () => {
    if (loading) return <BrandLoader />;
    if (error) return <EmptyBox icon={NavCategories} message={error} />;
    if (categories.length === 0) return <EmptyBox icon={NavCategories} message="No categories" />;

    if (genderFilter) {
      const rows = categories.filter(
        c => genderFor(c, categories) === genderFilter && !isMainCategoryName(c.name),
      );
      if (rows.length === 0) return <EmptyBox icon={NavCategories} message="No categories" />;
      return rows.map(renderCard);
    }

    const other = [...groups.otherParents, ...groups.forGender('unisex')];
    // `_orphans` in the Flutter screen is a superset of `_otherParents`, so a
    // gender-less parent shows up under both "Other" and "Ungrouped" there.
    // Listing it once is the same set of categories, minus the double entry.
    const shown = new Set(other.map(c => c.id));
    const ungrouped = groups.orphans.filter(c => !shown.has(c.id));

    return (
      <>
        {MAIN_CATEGORY_NAMES.map(gender => (
          <div key={gender}>
            {groups.genderParents.filter(p => p.name.toLowerCase() === gender.toLowerCase()).map(renderCard)}
            {groups.forGender(gender.toLowerCase()).map(renderCard)}
          </div>
        ))}
        {other.length > 0 && (
          <>
            {groupHeading('Other')}
            {other.map(renderCard)}
          </>
        )}
        {ungrouped.length > 0 && (
          <>
            {groupHeading('Ungrouped')}
            {ungrouped.map(renderCard)}
          </>
        )}
      </>
    );
  };

  return (
    <>
      <PageHeader title="Categories" subtitle={`${categories.length} total`} onMenu={onMenu} />
      <PageBody>
        <FilterChips options={GENDER_FILTERS} active={genderFilter} onSelect={setGenderFilter} />
        <div className="mt-4">{body()}</div>
      </PageBody>
      <FloatingAction onClick={() => onNavigate('/categories/new')} label="Add category" icon={Plus} />
    </>
  );
}
