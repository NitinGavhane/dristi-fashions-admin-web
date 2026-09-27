/**
 * Create / edit a product — a port of
 * dristi-admin-app/lib/screens/product_form_screen.dart.
 *
 * Two things carried over deliberately, because the backend expects them:
 *  • The "Discount" field is the rupees OFF, not the final price. It is saved
 *    as `discount_price = price - amount` and read back the same way.
 *  • Gender is never picked by hand — it is inherited from the chosen category,
 *    so a men's category can never hold a "women" product.
 *
 * Laid out as a two-column form: the record on the left, the things that decide
 * how it is merchandised (media, status, pricing summary) on the right.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Close,
  Film,
  HardDrive,
  LinkIcon,
  Package,
  Plus,
  Star,
  Trash,
} from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { capitalise, money0 } from '../lib/format';
import { GENDER_OPTIONS, type AdminCategory } from '../types';
import {
  IMAGE_ACCEPT,
  IMAGE_SPECS,
  UploadRejected,
  VIDEO_ACCEPT,
  validateAndUploadImage,
  validateAndUploadVideo,
} from '../lib/uploads';
import { useToast } from '../context/AdminContext';
import { FormBody, PageHeader, StickyActions } from '../components/AdminShell';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Select,
  Separator,
  Switch,
  Textarea,
  type Option,
} from '../components/primitives';
import {
  BrandLoader,
  ImageSpecsBox,
  Modal,
  NoteBox,
  SafeImage,
  SpecRow,
  UploadButton,
  VideoTile,
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
   * All categories, grouped under their parent. Categories are never hidden by
   * the selected gender — doing so could leave the dropdown empty and make it
   * impossible to set a category at all.
   */
  const categoryOptions = useMemo<Option[]>(() => {
    const options: Option[] = [{ value: '', label: 'Select a category' }];
    const parents = categories.filter(c => c.parentId === null);
    for (const parent of parents) {
      options.push({ value: parent.id, label: parent.name });
      for (const sub of categories.filter(c => c.parentId === parent.id)) {
        options.push({ value: sub.id, label: sub.name, indent: true });
      }
    }
    // Include any category whose parent isn't in the list, so a previously
    // saved category is always selectable.
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
      // Promote the first remaining image when the primary goes.
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
  const hasPricing = Number.isFinite(priceValue);
  const finalPrice = hasPricing && Number.isFinite(discountValue) ? priceValue - discountValue : priceValue;

  const save = async () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Required';
    if (!sku.trim()) next.sku = 'Required';
    if (!price.trim()) next.price = 'Required';
    else if (!Number.isFinite(priceValue)) next.price = 'Enter a number';
    if (!categoryId) next.category = 'Select a category';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast('Check the highlighted fields', { error: true });
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

  if (loading) return <BrandLoader />;

  return (
    <FormBody>
      <PageHeader
        title={isEdit ? 'Edit product' : 'New product'}
        description="What shoppers see on the product page."
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Basics" />
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Title"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                error={errors.title}
                placeholder="Cotton formal shirt"
                className="sm:col-span-2"
              />
              <Input
                label="SKU"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                error={errors.sku}
                placeholder="DF-SHIRT-01"
                className="font-mono"
              />
              <Input label="Brand" value={brand} onChange={e => setBrand(e.target.value)} />
              <Textarea
                label="Description"
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="sm:col-span-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Pricing" description="GST is applied automatically at checkout." />
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Price"
                  required
                  type="number"
                  hint="₹"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  error={errors.price}
                />
                <Input
                  label="Discount"
                  type="number"
                  hint="₹ off"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  description="Rupees off, not the final price."
                />
                <Input label="Stock" type="number" value={stock} onChange={e => setStock(e.target.value)} />
              </div>

              <NoteBox>
                Within West Bengal: CGST 9% + SGST 9%. Other states: IGST 18%. Decided from the customer&apos;s
                delivery address, so there is nothing to set per product.
              </NoteBox>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Variants"
              description="Sizes and colours. Leave empty for a single-variant product."
              actions={
                <Button size="sm" variant="outline" icon={Plus} onClick={() => setVariants(v => [...v, newVariant()])}>
                  Add variant
                </Button>
              }
            />
            <CardContent>
              {variants.length === 0 ? (
                <p className="py-3 text-center text-[13px] text-muted-foreground">No variants yet.</p>
              ) : (
                <div className="space-y-3">
                  {variants.map((v, i) => (
                    <div key={v.key} className="flex items-end gap-3 rounded-lg border border-border bg-hover/40 p-3">
                      <Input
                        label="Size"
                        value={v.size}
                        onChange={e => setVariants(l => l.map((x, idx) => (idx === i ? { ...x, size: e.target.value } : x)))}
                        placeholder="M"
                      />
                      <Input
                        label="Colour"
                        value={v.color}
                        onChange={e => setVariants(l => l.map((x, idx) => (idx === i ? { ...x, color: e.target.value } : x)))}
                        placeholder="White"
                      />
                      <Input
                        label="Stock"
                        type="number"
                        value={v.stock}
                        onChange={e => setVariants(l => l.map((x, idx) => (idx === i ? { ...x, stock: e.target.value } : x)))}
                      />
                      <Input
                        label="Price"
                        type="number"
                        hint="₹"
                        value={v.price}
                        onChange={e => setVariants(l => l.map((x, idx) => (idx === i ? { ...x, price: e.target.value } : x)))}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        icon={Trash}
                        aria-label="Remove variant"
                        onClick={() => setVariants(l => l.filter((_, idx) => idx !== i))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Side column ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Organisation" />
            <CardContent className="space-y-4">
              <Select
                label="Category"
                required
                value={categoryId}
                options={categoryOptions}
                error={errors.category}
                onChange={e => {
                  setCategoryId(e.target.value);
                  // Keep gender in step with the category so the product lands
                  // under the right tab.
                  const cat = categories.find(c => c.id === e.target.value);
                  const g = cat?.gender?.toLowerCase();
                  if (g && (GENDER_OPTIONS as readonly string[]).includes(g)) setGender(g);
                }}
              />

              <div className="flex items-center justify-between rounded-lg border border-border bg-hover/40 px-3 py-2.5">
                <span className="text-[12.5px] text-muted-foreground">Gender</span>
                {gender ? (
                  <Badge color="var(--color-primary)">{capitalise(gender)}</Badge>
                ) : (
                  <span className="text-[12.5px] text-subtle-foreground">From category</span>
                )}
              </div>
            </CardContent>
          </Card>

          {hasPricing && (
            <Card>
              <CardHeader title="Price summary" />
              <CardContent className="py-2">
                <div className="flex items-baseline justify-between py-1.5">
                  <span className="text-[12.5px] text-muted-foreground">List price</span>
                  <span className="tnum text-[13.5px] text-foreground">{money0(priceValue)}</span>
                </div>
                {Number.isFinite(discountValue) && discountValue > 0 && (
                  <div className="flex items-baseline justify-between py-1.5">
                    <span className="text-[12.5px] text-muted-foreground">Discount</span>
                    <span className="tnum text-[13.5px] text-destructive">−{money0(discountValue)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex items-baseline justify-between py-1.5">
                  <span className="text-[13px] font-medium text-foreground">Customer pays</span>
                  <span className="tnum text-[15px] font-semibold text-success">{money0(finalPrice)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader title="Status" />
            <CardContent className="divide-y divide-border">
              <Switch label="Active" description="Visible in the store." checked={active} onChange={setActive} />
              <Switch label="Featured" description="Promoted on the home page." checked={featured} onChange={setFeatured} />
              <Switch label="Returnable" checked={returnable} onChange={setReturnable} />
              <Switch label="Replaceable" checked={replaceable} onChange={setReplaceable} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Images"
              description={images.length > 0 ? `${images.length} uploaded` : undefined}
              actions={
                <Button size="sm" variant="ghost" icon={LinkIcon} onClick={() => setUrlDialog('image')}>
                  URL
                </Button>
              }
            />
            <CardContent className="space-y-3">
              <ImageSpecsBox specs={IMAGE_SPECS.product} />
              <UploadButton uploading={uploadingImage} onFile={pickImage} accept={IMAGE_ACCEPT} />

              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((img, i) => (
                    <div
                      key={`${img.url}-${i}`}
                      className="group relative size-20 overflow-hidden rounded-lg border"
                      style={{
                        borderColor: img.isPrimary ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                    >
                      <SafeImage src={img.url} alt="" className="size-full object-cover" />
                      {img.isPrimary && (
                        <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-px text-[9px] font-semibold text-primary-foreground">
                          Primary
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={() => makePrimary(i)}
                            aria-label="Make primary"
                            title="Make primary"
                            className="grid size-6 place-items-center rounded bg-black/60 text-white hover:bg-black/80"
                          >
                            <Star size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          aria-label="Remove image"
                          className="grid size-6 place-items-center rounded bg-black/60 text-white hover:bg-black/80"
                        >
                          <Close size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Video"
              actions={
                videos.length === 0 ? (
                  <Button size="sm" variant="ghost" icon={LinkIcon} onClick={() => setUrlDialog('video')}>
                    URL
                  </Button>
                ) : undefined
              }
            />
            <CardContent className="space-y-3">
              {/* A product carries a single video; once one is added the upload
                  affordances are hidden. Remove it to add another. */}
              {videos.length === 0 ? (
                <>
                  <div className="space-y-1.5">
                    <SpecRow icon={HardDrive} text="Up to 50 MB" />
                    <SpecRow icon={Film} text="MP4, WebM or MOV" />
                  </div>
                  <UploadButton
                    uploading={uploadingVideo}
                    onFile={pickVideo}
                    label="Upload video"
                    accept={VIDEO_ACCEPT}
                  />
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {videos.map((v, i) => (
                    <VideoTile
                      key={`${v.url}-${i}`}
                      thumbnailUrl={v.thumbnailUrl}
                      onRemove={() => setVideos(list => list.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <StickyActions>
        <Button variant="ghost" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" icon={Package} onClick={save} loading={saving}>
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </StickyActions>

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
    </FormBody>
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
      title={isImage ? 'Add image by URL' : 'Add video by URL'}
      icon={isImage ? LinkIcon : Film}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!url.trim()} onClick={() => onAdd(url.trim())}>
            Add
          </Button>
        </>
      }
    >
      <Input
        label={isImage ? 'Image URL' : 'Video URL'}
        value={url}
        onChange={e => setUrl(e.target.value)}
        autoFocus
        placeholder={isImage ? 'https://example.com/image.jpg' : 'https://example.com/product.mp4'}
      />
    </Modal>
  );
}
