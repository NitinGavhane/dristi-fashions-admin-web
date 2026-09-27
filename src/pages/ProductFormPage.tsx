/**
 * Create / edit a product — a port of
 * dristi-admin-app/lib/screens/product_form_screen.dart.
 *
 * Two things carried over deliberately, because the backend expects them:
 *  • The "Discount Amount" field is the rupees OFF, not the final price. It is
 *    saved as `discount_price = price - amount` and read back the same way.
 *  • Gender is never picked by hand — it is inherited from the chosen category,
 *    so a men's category can never hold a "women" product.
 */
import { useEffect, useMemo, useState } from 'react';
import { Film, HardDrive, Link2, Package, Play, Plus, Star, Users, X } from 'lucide-react';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { capitalise, money0 } from '../lib/format';
import { GENDER_OPTIONS, type AdminCategory } from '../types';
import { IMAGE_ACCEPT, IMAGE_SPECS, UploadRejected, VIDEO_ACCEPT, validateAndUploadImage, validateAndUploadVideo } from '../lib/uploads';
import { useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  FormSection,
  GhostButton,
  ImageSpecsBox,
  Modal,
  NoteBox,
  PageHeader,
  PrimaryButton,
  SafeImage,
  Select,
  SpecRow,
  TextInput,
  ToggleRow,
  UploadButton,
  type SelectOption,
} from '../components/ui';
import type { DetailPageProps } from './types';

interface ImageItem {
  url: string;
  isPrimary: boolean;
}

interface VideoItem {
  url: string;
  thumbnailUrl: string | null;
}

interface VariantRow {
  key: number;
  size: string;
  color: string;
  stock: string;
  price: string;
}

let variantKey = 0;
const newVariant = (): VariantRow => ({ key: ++variantKey, size: '', color: '', stock: '0', price: '' });

export function ProductFormPage({ productId, onBack }: DetailPageProps & { productId: string | null }) {
  const isEdit = productId !== null;
  const toast = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [urlDialog, setUrlDialog] = useState<'image' | 'video' | null>(null);

  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [stock, setStock] = useState('0');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [replaceable, setReplaceable] = useState(false);
  const [returnable, setReturnable] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    api
      .getCategories()
      .then(c => {
        if (live) setCategories(c);
      })
      .catch(() => {
        /* the dropdown falls back to whatever is already loaded */
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!productId) return;
    let live = true;
    setLoading(true);
    api
      .getProduct(productId)
      .then(p => {
        if (!live) return;
        setTitle(p.title);
        setSku(p.sku);
        setPrice(String(p.price));
        // The field holds the rupees OFF, so derive it back from discount_price.
        setDiscount(p.discountPrice != null ? String(Math.round(p.price - p.discountPrice)) : '');
        setStock(String(p.stock));
        setDescription(p.description ?? '');
        setBrand(p.brand ?? '');
        setCategoryId(p.categoryId ?? '');
        setGender(p.gender ?? null);
        setFeatured(p.featured);
        setActive(p.isActive);
        setReplaceable(p.isReplaceable);
        setReturnable(p.isReturnable);
        setImages(p.images.map(i => ({ url: i.imageUrl, isPrimary: i.isPrimary })));
        setVideos(p.videos.map(v => ({ url: v.videoUrl, thumbnailUrl: v.thumbnailUrl })));
        setVariants(
          p.variants.map(v => ({
            key: ++variantKey,
            size: v.size ?? '',
            color: v.color ?? '',
            stock: String(v.stock),
            price: v.price != null ? String(v.price) : '',
          })),
        );
      })
      .catch(e => toast(errorMessage(e), { error: true }))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [productId, toast]);

  /**
   * All categories as options, grouped under their parent. Categories are never
   * hidden by the selected gender — doing so could leave the dropdown empty and
   * make it impossible to set a category (so products could not be created).
   */
  const categoryOptions = useMemo<SelectOption[]>(() => {
    const options: SelectOption[] = [{ value: '', label: 'Select a category' }];
    const parents = categories.filter(c => c.parentId === null);
    for (const parent of parents) {
      options.push({ value: parent.id, label: parent.name });
      for (const sub of categories.filter(c => c.parentId === parent.id)) {
        options.push({ value: sub.id, label: sub.name, indent: true });
      }
    }
    // Include any category whose parent isn't in the list so a previously saved
    // category is always selectable.
    const shown = new Set(options.map(o => o.value));
    for (const c of categories) {
      if (!shown.has(c.id)) options.push({ value: c.id, label: c.name });
    }
    return options;
  }, [categories]);

  const addImage = (url: string) =>
    // The first image added becomes the primary one, so a product always has a
    // primary image to show in listings.
    setImages(list => [...list, { url, isPrimary: list.length === 0 }]);

  const removeImage = (index: number) =>
    setImages(list => {
      const next = list.filter((_, i) => i !== index);
      // Promote the first remaining image when the primary goes, so the product
      // never ends up with images but no primary.
      if (next.length > 0 && !next.some(i => i.isPrimary)) next[0] = { ...next[0], isPrimary: true };
      return next;
    });

  const makePrimary = (index: number) =>
    setImages(list => list.map((img, i) => ({ ...img, isPrimary: i === index })));

  const pickImage = async (file: File) => {
    setUploadingImage(true);
    try {
      addImage(await validateAndUploadImage(file, IMAGE_SPECS.product));
    } catch (e) {
      toast(e instanceof UploadRejected ? e.message : errorMessage(e), { error: true });
    } finally {
      setUploadingImage(false);
    }
  };

  const pickVideo = async (file: File) => {
    setUploadingVideo(true);
    try {
      const url = await validateAndUploadVideo(file);
      setVideos(list => [...list, { url, thumbnailUrl: null }]);
    } catch (e) {
      toast(e instanceof UploadRejected ? e.message : errorMessage(e), { error: true });
    } finally {
      setUploadingVideo(false);
    }
  };

  const priceValue = Number.parseFloat(price.trim());
  const discountValue = Number.parseFloat(discount.trim());
  const showPricePreview =
    price.trim() !== '' && discount.trim() !== '' && Number.isFinite(priceValue) && Number.isFinite(discountValue);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Required';
    if (!sku.trim()) next.sku = 'Required';
    if (!price.trim()) next.price = 'Required';
    else if (!Number.isFinite(priceValue)) next.price = 'Enter a number';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (!categoryId) {
      toast('Please select a category', { error: true });
      return;
    }

    const body: Record<string, unknown> = {
      title: title.trim(),
      sku: sku.trim(),
      price: priceValue,
      category_id: categoryId,
      stock: Number.parseInt(stock.trim(), 10) || 0,
      featured,
      is_active: active,
      is_replaceable: replaceable,
      is_returnable: returnable,
      variants: variants.map(v => ({
        size: v.size.trim() || null,
        color: v.color.trim() || null,
        stock: Number.parseInt(v.stock.trim(), 10) || 0,
        price: v.price.trim() ? Number.parseFloat(v.price.trim()) : null,
      })),
      images: images.map(img => ({ image_url: img.url, is_primary: img.isPrimary })),
      videos: videos.map(v => ({
        video_url: v.url,
        ...(v.thumbnailUrl ? { thumbnail_url: v.thumbnailUrl } : {}),
      })),
    };
    if (description.trim()) body.description = description.trim();
    if (brand.trim()) body.brand = brand.trim();
    if (discount.trim() && Number.isFinite(discountValue)) body.discount_price = priceValue - discountValue;
    if (gender) body.gender = gender;

    setSaving(true);
    try {
      if (productId) await api.updateProduct(productId, body);
      else await api.createProduct(body);
      toast(productId ? 'Product updated' : 'Product created', { success: true });
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
        <PageHeader title={isEdit ? 'Edit Product' : 'New Product'} onBack={onBack} />
        <BrandLoader />
      </>
    );
  }

  return (
    <>
      <PageHeader title={isEdit ? 'Edit Product' : 'New Product'} onBack={onBack} />
      <PageBody className="space-y-4">
        <FormSection title="Basic Info">
          <TextInput label="Product Title" value={title} onChange={setTitle} required error={errors.title} />
          <TextInput label="SKU" value={sku} onChange={setSku} required error={errors.sku} />
          <div className="grid gap-x-3 sm:grid-cols-2">
            <TextInput label="Price" value={price} onChange={setPrice} number required error={errors.price} />
            <TextInput
              label="Discount Amount"
              value={discount}
              onChange={setDiscount}
              number
              hint="Rupees off the price"
            />
          </div>

          {showPricePreview && (
            <div className="mb-4 rounded-lg border border-btn/30 bg-btn/5 p-3.5">
              <PriceRow label="Original Price" amount={priceValue} />
              <PriceRow label="Discount" amount={-discountValue} />
              <hr className="my-2 border-hair-light" />
              <PriceRow label="Final Price" amount={priceValue - discountValue} bold color="var(--color-success)" />
            </div>
          )}

          <TextInput label="Stock" value={stock} onChange={setStock} number />

          {/* GST is applied automatically at checkout based on the customer's
              state — nothing to configure per product. */}
          <NoteBox>
            <p className="text-[13px] font-bold text-ink">GST applied automatically</p>
            <p className="mt-1 whitespace-pre-line">
              {'Within West Bengal: CGST 9% + SGST 9%.\nOther states: IGST 18%.\nDecided from the customer’s delivery address.'}
            </p>
          </NoteBox>
        </FormSection>

        <FormSection title="Images">
          <ImageSpecsBox specs={IMAGE_SPECS.product} />
          <div className="mt-3">
            <UploadButton uploading={uploadingImage} onFile={pickImage} accept={IMAGE_ACCEPT} />
          </div>

          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div
                  key={`${img.url}-${i}`}
                  className="relative size-[90px] overflow-hidden rounded-lg border bg-bg-alt"
                  style={{
                    borderColor: img.isPrimary ? 'var(--color-coral)' : 'var(--color-hair)',
                    borderWidth: img.isPrimary ? 2 : 1,
                  }}
                >
                  <SafeImage src={img.url} alt="" className="size-full object-cover" />
                  {img.isPrimary && (
                    <span className="absolute left-1 top-1 rounded-sm bg-gradient-to-r from-coral to-coral-80 px-1.5 py-0.5 text-[7px] font-extrabold tracking-[0.5px] text-white shadow-sm-soft">
                      PRIMARY
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="Remove image"
                    className="absolute right-1 top-1 grid size-[22px] place-items-center rounded bg-btn text-white shadow-violet"
                  >
                    <X size={14} />
                  </button>
                  {!img.isPrimary && (
                    <button
                      type="button"
                      onClick={() => makePrimary(i)}
                      aria-label="Make primary image"
                      title="Make primary"
                      className="absolute bottom-1 right-1 grid size-[22px] place-items-center rounded bg-btn text-white shadow-violet"
                    >
                      <Star size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setUrlDialog('image')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-btn py-3 text-white shadow-violet transition hover:brightness-110"
          >
            <Link2 size={18} />
            <span className="label-caps text-[10px] tracking-[2px]">Add image URL</span>
          </button>
        </FormSection>

        <FormSection title="Videos">
          <div className="rounded-lg border border-coral/25 bg-coral/5 p-3">
            <p className="text-[13px] font-semibold text-ink">Video requirements</p>
            <div className="mt-2">
              <SpecRow icon={HardDrive} text="Max file size: 50 MB" />
              <SpecRow icon={Film} text="Formats: MP4, WebM, MOV" />
              <SpecRow icon={Play} text="One video per product" />
            </div>
          </div>

          {/* A product carries a single video; once one is added the upload/URL
              affordances are hidden. Remove it to add another. */}
          {videos.length === 0 ? (
            <>
              <div className="mt-3">
                <UploadButton
                  uploading={uploadingVideo}
                  onFile={pickVideo}
                  label="Upload Video"
                  accept={VIDEO_ACCEPT}
                />
              </div>
              <button
                type="button"
                onClick={() => setUrlDialog('video')}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-btn py-3 text-white shadow-violet transition hover:brightness-110"
              >
                <Link2 size={18} />
                <span className="label-caps text-[10px] tracking-[2px]">Add video URL</span>
              </button>
            </>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {videos.map((v, i) => (
                <div
                  key={`${v.url}-${i}`}
                  className="relative h-[90px] w-[120px] overflow-hidden rounded-lg border border-hair bg-bg-alt"
                >
                  {v.thumbnailUrl ? (
                    <SafeImage src={v.thumbnailUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-muted">
                      <Film size={28} />
                    </span>
                  )}
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid size-[30px] place-items-center rounded-full bg-black/55 text-white">
                      <Play size={18} />
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setVideos(list => list.filter((_, idx) => idx !== i))}
                    aria-label="Remove video"
                    className="absolute right-1 top-1 grid size-[22px] place-items-center rounded bg-btn text-white shadow-violet"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection title="Details">
          <TextInput label="Description" value={description} onChange={setDescription} multiline={3} />
          <TextInput label="Brand" value={brand} onChange={setBrand} />
          <Select
            label="Category"
            required
            value={categoryId}
            options={categoryOptions}
            onChange={value => {
              setCategoryId(value);
              // Keep the product's gender in sync with the chosen category so it
              // lands under the right gender tab.
              const cat = categories.find(c => c.id === value);
              const g = cat?.gender?.toLowerCase();
              if (g && (GENDER_OPTIONS as readonly string[]).includes(g)) setGender(g);
            }}
          />
          {/* Gender is inherited from the selected category (categories are
              gendered), so there is nothing to pick here. This only shows what
              will be saved. */}
          <div className="flex items-center gap-2.5 rounded-lg border border-hair bg-bg-alt px-3.5 py-3">
            <span className="shrink-0 text-muted">
              <Users size={16} />
            </span>
            <span className="text-xs text-muted">Gender (from category)</span>
            <span className="ml-auto text-[13px] font-bold text-ink">
              {gender ? capitalise(gender) : 'Select a category'}
            </span>
          </div>
        </FormSection>

        <FormSection title="Status">
          <div className="flex flex-wrap gap-3">
            <ToggleRow label="Featured" value={featured} onChange={setFeatured} />
            <ToggleRow label="Active" value={active} onChange={setActive} />
            <ToggleRow label="Replace" value={replaceable} onChange={setReplaceable} />
            <ToggleRow label="Return" value={returnable} onChange={setReturnable} />
          </div>
        </FormSection>

        <FormSection title="Variants">
          {variants.map((v, i) => (
            <div key={v.key} className="mb-2.5 rounded-lg border border-hair bg-bg-alt p-3.5">
              <div className="grid gap-x-2 sm:grid-cols-2">
                <TextInput
                  label="Size"
                  hint="M, L"
                  value={v.size}
                  onChange={value => setVariants(list => list.map((x, idx) => (idx === i ? { ...x, size: value } : x)))}
                />
                <TextInput
                  label="Color"
                  hint="Red"
                  value={v.color}
                  onChange={value => setVariants(list => list.map((x, idx) => (idx === i ? { ...x, color: value } : x)))}
                />
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TextInput
                    label="Stock"
                    number
                    value={v.stock}
                    onChange={value =>
                      setVariants(list => list.map((x, idx) => (idx === i ? { ...x, stock: value } : x)))
                    }
                  />
                </div>
                <div className="flex-1">
                  <TextInput
                    label="Price"
                    number
                    hint="Optional"
                    value={v.price}
                    onChange={value =>
                      setVariants(list => list.map((x, idx) => (idx === i ? { ...x, price: value } : x)))
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setVariants(list => list.filter((_, idx) => idx !== i))}
                  aria-label="Remove variant"
                  className="mt-[26px] grid size-9 shrink-0 place-items-center rounded-lg bg-btn text-white shadow-violet"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setVariants(list => [...list, newVariant()])}
              className="flex items-center gap-2 rounded-lg bg-btn px-6 py-3 text-white shadow-violet transition hover:brightness-110"
            >
              <Plus size={16} />
              <span className="label-caps text-[10px] tracking-[2px]">Add variant</span>
            </button>
          </div>
        </FormSection>

        <div className="pt-4">
          <PrimaryButton
            label={isEdit ? 'Update Product' : 'Create Product'}
            loading={saving}
            onClick={save}
            icon={Package}
          />
        </div>
      </PageBody>

      {urlDialog && (
        <UrlDialog
          kind={urlDialog}
          onClose={() => setUrlDialog(null)}
          onAdd={url => {
            if (urlDialog === 'image') addImage(url);
            else setVideos(list => [...list, { url, thumbnailUrl: null }]);
            setUrlDialog(null);
          }}
        />
      )}
    </>
  );
}

function PriceRow({
  label,
  amount,
  bold = false,
  color,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-[13px] text-ink-soft ${bold ? 'font-bold' : 'font-medium'}`}>{label}</span>
      <span
        className={`text-sm ${bold ? 'font-black' : 'font-semibold'}`}
        style={{ color: color ?? (amount < 0 ? 'var(--color-error)' : 'var(--color-ink)') }}
      >
        {money0(Math.abs(amount))}
      </span>
    </div>
  );
}

/** The "paste a URL instead of uploading" dialog, for images and for videos. */
function UrlDialog({
  kind,
  onAdd,
  onClose,
}: {
  kind: 'image' | 'video';
  onAdd: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const isImage = kind === 'image';

  return (
    <Modal
      title={isImage ? 'ADD IMAGE URL' : 'ADD VIDEO URL'}
      icon={isImage ? Link2 : Film}
      onClose={onClose}
      actions={
        <>
          <GhostButton label="Cancel" onClick={onClose} />
          <PrimaryButton
            label="Add"
            full={false}
            disabled={!url.trim()}
            onClick={() => {
              const trimmed = url.trim();
              if (trimmed) onAdd(trimmed);
            }}
          />
        </>
      }
    >
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        autoFocus
        placeholder={isImage ? 'https://example.com/image.jpg' : 'https://example.com/product.mp4'}
        aria-label={isImage ? 'Image URL' : 'Video URL'}
        className="w-full rounded-md border border-hair bg-bg-alt px-3 py-2.5 text-[13px] text-ink placeholder:text-xs placeholder:text-muted focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
      />
    </Modal>
  );
}
