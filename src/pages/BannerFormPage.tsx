/**
 * Create / edit a hero banner — a port of
 * dristi-admin-app/lib/screens/banner_form_screen.dart.
 *
 * Uploading and saving stay decoupled: the admin can paste an external URL
 * instead, and the form only ever submits `image_url`.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { IMAGE_ACCEPT, IMAGE_SPECS, UploadRejected, validateAndUploadImage } from '../lib/uploads';
import { useToast } from '../context/AdminContext';
import { FormBody, PageHeader, StickyActions } from '../components/AdminShell';
import { BannerCropPreview } from '../components/BannerCropPreview';
import { Button, Card, CardContent, CardHeader, Input, Switch } from '../components/primitives';
import { BrandLoader, ImageSpecsBox, UploadButton } from '../components/ui';
import type { DetailPageProps } from './types';

export function BannerFormPage({ bannerId, onBack }: DetailPageProps & { bannerId: string | null }) {
  const isEdit = bannerId !== null;
  const toast = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [image, setImage] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [section, setSection] = useState('hero');
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!bannerId) return;
    let live = true;
    setLoading(true);
    api
      .getBanner(bannerId)
      .then(b => {
        if (!live) return;
        setImage(b.imageUrl);
        setTitle(b.title ?? '');
        setSubtitle(b.subtitle ?? '');
        setLinkUrl(b.linkUrl ?? '');
        setLinkText(b.linkText ?? '');
        setSection(b.section);
        setSortOrder(String(b.sortOrder));
        setActive(b.isActive);
      })
      .catch(e => toast(errorMessage(e), { error: true }))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [bannerId, toast]);

  const pickImage = async (file: File) => {
    setUploading(true);
    try {
      setImage(await validateAndUploadImage(file, IMAGE_SPECS.banner));
      setImageError(null);
    } catch (e) {
      toast(e instanceof UploadRejected ? e.message : errorMessage(e), { error: true });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!image.trim()) {
      setImageError('Upload an image or paste a URL');
      return;
    }
    setImageError(null);
    setSaving(true);

    const body: Record<string, unknown> = {
      image_url: image.trim(),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(subtitle.trim() ? { subtitle: subtitle.trim() } : {}),
      ...(linkUrl.trim() ? { link_url: linkUrl.trim() } : {}),
      ...(linkText.trim() ? { link_text: linkText.trim() } : {}),
      section: section.trim() || 'hero',
      sort_order: Number.parseInt(sortOrder.trim(), 10) || 0,
      is_active: active,
    };

    try {
      if (bannerId) await api.updateBanner(bannerId, body);
      else await api.createBanner(body);
      toast(bannerId ? 'Banner updated' : 'Banner created', { success: true });
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
        title={isEdit ? 'Edit banner' : 'New banner'}
        description="The hero image shown on the storefront and in the app."
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
            Back
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Image" description="One image feeds both the app slider and the website hero." />
            <CardContent className="space-y-4">
              <ImageSpecsBox specs={IMAGE_SPECS.banner} />
              <UploadButton uploading={uploading} onFile={pickImage} accept={IMAGE_ACCEPT} />
              <Input
                label="Image URL"
                required
                value={image}
                onChange={e => setImage(e.target.value)}
                error={imageError}
                description="Filled in by the upload above, or paste an external URL."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Content" description="Optional copy and the link the banner points at." />
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} />
              <Input label="Subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
              <Input label="Link URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="/categories" />
              <Input label="Link text" value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Shop now" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Placement" description="Where it sits and whether it is live." />
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Section" value={section} onChange={e => setSection(e.target.value)} placeholder="hero" />
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
                description="Inactive banners stay saved but are not shown to customers."
                checked={active}
                onChange={setActive}
              />
            </CardContent>
          </Card>
        </div>

        {/* The crop preview earns a sticky column — it is what the admin checks
            against while editing, not something to scroll back up to. */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="Crop preview" description="Exactly what each surface will show." />
            <CardContent>
              <BannerCropPreview imageUrl={image} />
            </CardContent>
          </Card>
        </div>
      </div>

      <StickyActions>
        <Button variant="ghost" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} loading={saving}>
          {isEdit ? 'Save changes' : 'Create banner'}
        </Button>
      </StickyActions>
    </FormBody>
  );
}
