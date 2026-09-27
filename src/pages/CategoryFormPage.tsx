/**
 * Create / edit a category — a port of
 * dristi-admin-app/lib/screens/category_form_screen.dart.
 *
 * Creating a top-level Men / Women / Kids category also seeds its two default
 * subcategories ("All" and one named after the gender), which is what the
 * storefront's gender tabs expect to find.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Close } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { capitalise } from '../lib/format';
import { GENDER_OPTIONS, SPECIFIC_GENDERS, isMainCategoryName, isParentCategory, type AdminCategory } from '../types';
import { IMAGE_ACCEPT, IMAGE_SPECS, UploadRejected, validateAndUploadImage } from '../lib/uploads';
import { useToast } from '../context/AdminContext';
import { FormBody, PageHeader, StickyActions } from '../components/AdminShell';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Select,
  Switch,
  type Option,
} from '../components/primitives';
import { BrandLoader, ImageSpecsBox, NoteBox, SafeImage, UploadButton } from '../components/ui';
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
        /* the parent dropdown just stays at "None (top level)" */
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

  const parentOptions = useMemo<Option[]>(
    () => [
      { value: '', label: 'None (top level)' },
      ...allCats.filter(c => isParentCategory(c) && c.id !== categoryId).map(c => ({ value: c.id, label: c.name })),
    ],
    [allCats, categoryId],
  );

  /** The effective gender a parent confers — its own, or its main-category name. */
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
   * Resolved the same way the backend does: an explicitly chosen real gender
   * wins, otherwise inherit from the parent, otherwise the category's own name,
   * otherwise unisex.
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

  const seedsSubcategories = !parentId && !isEdit && isMainCategoryName(name);

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

  if (loading) return <BrandLoader />;

  return (
    <FormBody>
      <PageHeader
        title={isEdit ? 'Edit category' : 'New category'}
        description="How the catalogue is organised for shoppers."
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
        }
      />

      <div className="space-y-5">
        <Card>
          <CardHeader title="Details" />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              error={nameError}
              placeholder="Shirts"
            />
            <Select
              label="Parent category"
              value={parentId}
              onChange={e => {
                setParentId(e.target.value);
                const inherited = genderFromParent(e.target.value);
                if (inherited) setGender(inherited);
              }}
              options={parentOptions}
              description="Leave at top level to create a new branch."
            />
            <Input
              label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="sm:col-span-2"
            />
            <Select
              label="Gender"
              value={gender}
              onChange={e => setGender(e.target.value)}
              options={[
                { value: '', label: 'Auto (from parent or name)' },
                ...GENDER_OPTIONS.map(g => ({ value: g, label: capitalise(g) })),
              ]}
              description={`Will save as "${resolveGender()}".`}
            />
            <div className="flex items-end">
              <div className="w-full">
                <Switch
                  label="Active"
                  description="Hidden from the storefront when off."
                  checked={active}
                  onChange={setActive}
                />
              </div>
            </div>

            {seedsSubcategories && (
              <div className="sm:col-span-2">
                <NoteBox>
                  Creating “{name.trim()}” will also seed its two default subcategories — <strong>All</strong> and{' '}
                  <strong>{name.trim()}</strong> — which the storefront's gender tabs expect to find.
                </NoteBox>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Image" description="Shown on category tiles in the app and on the website." />
          <CardContent className="space-y-4">
            <ImageSpecsBox specs={IMAGE_SPECS.category} />
            <UploadButton uploading={uploading} onFile={pickImage} accept={IMAGE_ACCEPT} />
            <Input
              label="Image URL"
              value={imageField}
              onChange={e => setImageField(e.target.value)}
              description="Filled in by the upload above, or paste an external URL."
            />
            {imageField.trim() && (
              <div className="relative w-full max-w-xs overflow-hidden rounded-lg border border-border">
                <SafeImage
                  src={imageField.trim()}
                  alt="Category image preview"
                  className="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageField('')}
                  aria-label="Clear image"
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-md bg-black/60 text-white transition-colors duration-150 hover:bg-black/80"
                >
                  <Close size={14} />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <StickyActions>
        <Button variant="ghost" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} loading={saving}>
          {isEdit ? 'Save changes' : 'Create category'}
        </Button>
      </StickyActions>
    </FormBody>
  );
}
