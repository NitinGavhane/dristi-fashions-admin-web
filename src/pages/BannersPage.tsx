import { ImageOff, NavBanners, Plus } from '../components/icons';
/**
 * Hero banners — a port of dristi-admin-app/lib/screens/banners_screen.dart.
 * Each card shows the image at the App slider's 3:2 frame so the crop is honest.
 */
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { useAsync } from '../lib/useAsync';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  DeleteButton,
  EditButton,
  EmptyBox,
  FloatingAction,
  PageHeader,
  SafeImage,
} from '../components/ui';
import type { PageProps } from './types';

export function BannersPage({ onNavigate, onMenu }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getBanners(), []);
  const confirm = useConfirm();
  const toast = useToast();
  const banners = data ?? [];

  const remove = async (id: string) => {
    const ok = await confirm({ message: 'Remove this banner?' });
    if (!ok) return;
    try {
      await api.deleteBanner(id);
      toast('Banner removed', { success: true });
      reload();
    } catch (e) {
      toast(`Delete failed: ${errorMessage(e)}`, { error: true });
    }
  };

  return (
    <>
      <PageHeader title="Sliding Banners" subtitle={`${banners.length} total`} onMenu={onMenu} />
      <PageBody>
        {loading ? (
          <BrandLoader />
        ) : error ? (
          <EmptyBox icon={NavBanners} message={error} />
        ) : banners.length === 0 ? (
          <EmptyBox icon={NavBanners} message="No banners yet — use + to add one" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {banners.map(b => (
              <div
                key={b.id}
                className="bg-white/[0.02] overflow-hidden rounded-2xl border shadow-[0_18px_40px_-20px_rgba(0,0,0,0.85)]"
                style={{
                  borderColor: b.isActive
                    ? 'color-mix(in srgb, var(--color-accent) 25%, transparent)'
                    : 'var(--color-hair)',
                }}
              >
                <div className="bg-raised" style={{ aspectRatio: 3 / 2 }}>
                  <SafeImage
                    src={b.imageUrl}
                    alt={b.title ?? 'Banner'}
                    className="size-full object-cover"
                    fallback={<ImageOff size={36} />}
                  />
                </div>
                <div className="flex items-center gap-2 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{b.title || 'Untitled banner'}</p>
                    <span
                      className="mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        color: b.isActive ? 'var(--color-muted)' : 'var(--color-error)',
                        backgroundColor: b.isActive
                          ? 'var(--color-raised)'
                          : 'color-mix(in srgb, var(--color-error) 8%, transparent)',
                      }}
                    >
                      SECTION: {b.section.toUpperCase()} · ORDER {b.sortOrder}
                      {!b.isActive && ' · INACTIVE'}
                    </span>
                  </div>
                  <EditButton onClick={() => onNavigate(`/banners/${b.id}`)} label="Edit banner" />
                  <DeleteButton onClick={() => remove(b.id)} label="Delete banner" />
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
      <FloatingAction onClick={() => onNavigate('/banners/new')} label="Add banner" icon={Plus} />
    </>
  );
}
