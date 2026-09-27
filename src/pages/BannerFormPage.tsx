/**
 * Create / edit a hero banner — a port of
 * dristi-admin-app/lib/screens/banner_form_screen.dart.
 *
 * Uploading and saving stay decoupled: the admin can paste an external URL
 * instead, and the form only ever submits `image_url`.
 */
import { useEffect, useState } from 'react';
import { GalleryHorizontalEnd } from 'lucide-react';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { IMAGE_ACCEPT, IMAGE_SPECS, UploadRejected, validateAndUploadImage } from '../lib/uploads';
import { useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import { BannerCropPreview } from '../components/BannerCropPreview';
import {
  BrandLoader,
  FormSection,
  ImageSpecsBox,
  PageHeader,
  PrimaryButton,
  TextInput,
  ToggleRow,
  UploadButton,
} from '../components/ui';
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
      setImageError('Upload an image or provide a URL');
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

  if (loading) {
    return (
      <>
        <PageHeader title={isEdit ? 'Edit Banner' : 'New Banner'} onBack={onBack} />
        <BrandLoader />
      </>
    );
  }

  return (
    <>
      <PageHeader title={isEdit ? 'Edit Banner' : 'New Banner'} onBack={onBack} />
      <PageBody className="space-y-4">
        <FormSection title="Banner Image">
          <ImageSpecsBox specs={IMAGE_SPECS.banner} />
          <div className="my-3">
            <UploadButton uploading={uploading} onFile={pickImage} accept={IMAGE_ACCEPT} />
          </div>
          <TextInput
            label="Image URL"
            value={image}
            onChange={setImage}
            required
            hint="Upload above, or paste a URL"
            error={imageError}
          />
        </FormSection>

        <BannerCropPreview imageUrl={image} />

        <FormSection title="Details (optional)">
          <TextInput
            label="Title"
            value={title}
            onChange={setTitle}
            hint="Shown for accessibility / future overlays"
          />
          <TextInput label="Subtitle" value={subtitle} onChange={setSubtitle} hint="Optional" />
          <TextInput
            label="Link URL"
            value={linkUrl}
            onChange={setLinkUrl}
            hint="Where the banner points (optional)"
          />
          <TextInput label="Link Text" value={linkText} onChange={setLinkText} hint="e.g. Shop Now (optional)" />
        </FormSection>

        <FormSection title="Placement">
          <TextInput label="Section" value={section} onChange={setSection} hint="hero" />
          <TextInput label="Sort Order" value={sortOrder} onChange={setSortOrder} number hint="0 = first" />
          <ToggleRow label="Active" value={active} onChange={setActive} />
        </FormSection>

        <div className="pt-4">
          <PrimaryButton
            label={isEdit ? 'Update Banner' : 'Create Banner'}
            loading={saving}
            onClick={save}
            icon={GalleryHorizontalEnd}
          />
        </div>
      </PageBody>
    </>
  );
}
