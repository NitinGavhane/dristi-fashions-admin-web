/**
 * Create / edit a category — a port of
 * dristi-admin-app/lib/screens/category_form_screen.dart.
 *
 * Creating a top-level Men / Women / Kids category also seeds its two default
 * subcategories ("All" and one named after the gender), which is what the
 * storefront's gender tabs expect to find.
 */
import { useEffect, useMemo, useState } from 'react';
import { Info, Shapes, X } from 'lucide-react';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { capitalise } from '../lib/format';
import { GENDER_OPTIONS, SPECIFIC_GENDERS, isMainCategoryName, isParentCategory, type AdminCategory } from '../types';
import { IMAGE_ACCEPT, IMAGE_SPECS, UploadRejected, validateAndUploadImage } from '../lib/uploads';
import { useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  FormSection,
  ImageSpecsBox,
  PageHeader,
  PrimaryButton,
  SafeImage,
  Select,
  TextInput,
  ToggleRow,
  UploadButton,
  type SelectOption,
} from '../components/ui';
import type { DetailPageProps } from './types';

export function CategoryFormPage({ categoryId, onBack }: DetailPageProps & { categoryId: string | null }) {
  const isEdit = categoryId !== null;
  const toast = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageField, setImageField] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [gender, setGender] = useState('');
  const [active, setActive] = useState(true);
  const [allCats, setAllCats] = useState<AdminCategory[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .getCategories()
      .then(c => {
        if (live) setAllCats(c);
      })
      .catch(() => {
        /* the parent dropdown just stays at "None (Top-level)" */
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    let live = true;
    setLoading(true);

    // Fall back to finding the row in the list when the by-id endpoint fails,
    // as the Flutter screen does.
    const fetch = async (): Promise<AdminCategory | null> => {
      try {
        return await api.getCategory(categoryId);
      } catch {
        const all = await api.getCategories();
        return all.find(c => c.id === categoryId) ?? null;
      }
    };

    fetch()
      .then(cat => {
        if (!live || !cat) return;
        setName(cat.name);
        setDescription(cat.description ?? '');
        setImageField(cat.imageUrl ?? '');
        setSlug(cat.slug);
        setParentId(cat.parentId ?? '');
        setGender(cat.gender ?? '');
        setActive(cat.isActive);
      })
      .catch(e => toast(errorMessage(e), { error: true }))
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [categoryId, toast]);

  const parentOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'None (Top-level)' },
      ...allCats.filter(c => isParentCategory(c) && c.id !== categoryId).map(c => ({ value: c.id, label: c.name })),
    ],
    [allCats, categoryId],
  );

  /**
   * `_genderFromParent` — the effective gender a parent confers, by the parent's
   * own gender or by its main-category name.
   */
  const genderFromParent = (id: string): string => {
    if (!id) return '';
    const parent = allCats.find(c => c.id === id);
    if (!parent) return '';
    const pg = parent.gender?.toLowerCase();
    if (pg && (SPECIFIC_GENDERS as readonly string[]).includes(pg)) return pg;
    const pn = parent.name.trim().toLowerCase();
    if ((SPECIFIC_GENDERS as readonly string[]).includes(pn)) return pn;
    return '';
  };

  /**
   * `_resolveGender` — resolved the same way the backend does: an explicitly
   * chosen real gender wins, otherwise inherit from the parent, otherwise the
   * category's own name, otherwise unisex.
   */
  const resolveGender = (): string => {
    if (gender && (SPECIFIC_GENDERS as readonly string[]).includes(gender.toLowerCase())) {
      return gender.toLowerCase();
    }
    const fromParent = genderFromParent(parentId);
    if (fromParent) return fromParent;
    const typed = name.trim().toLowerCase();
    if ((SPECIFIC_GENDERS as readonly string[]).includes(typed)) return typed;
    return gender || 'unisex';
  };

  const pickImage = async (file: File) => {
    setUploading(true);
    try {
      setImageField(await validateAndUploadImage(file, IMAGE_SPECS.category));
    } catch (e) {
      toast(e instanceof UploadRejected ? e.message : errorMessage(e), { error: true });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setNameError('Required');
      return;
    }
    setNameError(null);
    setSaving(true);

    const resolvedGender = resolveGender();
    const image = imageField.trim();
    const desc = description.trim();

    try {
      if (categoryId) {
        await api.updateCategory(categoryId, {
          name: name.trim(),
          ...(slug ? { slug } : {}),
          ...(desc ? { description: desc } : {}),
          // Sent even when empty (as null) so clearing the image actually
          // removes it — and lets the backend delete the S3 object.
          image_url: image || null,
          is_active: active,
          gender: resolvedGender,
          ...(parentId ? { parent_id: parentId } : {}),
        });
      } else {
        const categoryName = name.trim();
        const created = await api.createCategory({
          name: categoryName,
          slug: slug || categoryName.toLowerCase().replace(/ /g, '-'),
          ...(desc ? { description: desc } : {}),
          ...(image ? { image_url: image } : {}),
          gender: resolvedGender,
          ...(parentId ? { parent_id: parentId } : {}),
        });

        if (!parentId && isMainCategoryName(categoryName)) {
          const g = categoryName.toLowerCase();
          await api.createCategory({ name: 'All', slug: `${g}-all`, gender: g, parent_id: created.id });
          await api.createCategory({ name: categoryName, slug: `${g}-${g}`, gender: g, parent_id: created.id });
        }
      }

      toast(categoryId ? 'Category updated' : 'Category created', { success: true });
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
        <PageHeader title={isEdit ? 'Edit Category' : 'New Category'} onBack={onBack} />
        <BrandLoader />
      </>
    );
  }

  return (
    <>
      <PageHeader title={isEdit ? 'Edit Category' : 'New Category'} onBack={onBack} />
      <PageBody className="space-y-4">
        <FormSection title="Category Info">
          <TextInput label="Category Name" value={name} onChange={setName} required error={nameError} />
          <TextInput
            label="Description"
            value={description}
            onChange={setDescription}
            multiline={3}
            hint="Optional"
          />

          <ImageSpecsBox specs={IMAGE_SPECS.category} />
          <div className="my-3">
            <UploadButton uploading={uploading} onFile={pickImage} accept={IMAGE_ACCEPT} />
          </div>
          <TextInput
            label="Image URL"
            value={imageField}
            onChange={setImageField}
            hint="Upload above, or paste a URL"
          />

          {imageField.trim() && (
            <div className="relative mb-3.5 h-[140px] overflow-hidden rounded-lg border border-hair bg-bg-alt">
              <SafeImage src={imageField.trim()} alt="Category image preview" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setImageField('')}
                aria-label="Clear image"
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-btn text-white shadow-violet"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <Select
            label="Parent Category"
            value={parentId}
            options={parentOptions}
            onChange={value => {
              setParentId(value);
              const inherited = genderFromParent(value);
              if (inherited) setGender(inherited);
            }}
          />
          <Select
            label="Gender"
            value={gender}
            options={[
              { value: '', label: 'Auto (from parent or name)' },
              ...GENDER_OPTIONS.map(g => ({ value: g, label: capitalise(g) })),
            ]}
            onChange={setGender}
          />

          <div className="flex flex-wrap items-center gap-4">
            {isEdit && <p className="text-[11px] text-muted">Slug: {slug || 'auto'}</p>}
            <div className="ml-auto">
              <ToggleRow label="Active" value={active} onChange={setActive} />
            </div>
          </div>
        </FormSection>

        {!parentId && (
          <div className="card-surface flex items-center gap-3 rounded-lg border border-gold/30 p-4 shadow-sm-soft">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-gold/10 text-gold">
              <Info size={18} />
            </span>
            <p className="text-[11px] text-ink-soft">
              No parent = top-level category. Subcategories can be assigned below it.
            </p>
          </div>
        )}

        <div className="pt-4">
          <PrimaryButton
            label={isEdit ? 'Update Category' : 'Create Category'}
            loading={saving}
            onClick={save}
            icon={Shapes}
          />
        </div>
      </PageBody>
    </>
  );
}
