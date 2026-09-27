/**
 * Hero banners — a port of dristi-admin-app/lib/screens/banners_screen.dart.
 *
 * The one list that stays a gallery rather than becoming a table: these records
 * *are* their image, and a 40px thumbnail in a table row would not let anyone
 * judge the crop. Each tile shows the image at the app slider's 3:2 frame.
 */
import { ImageOff, MoreHorizontal, NavBanners, Pencil, Plus, Trash } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { useAsync } from '../lib/useAsync';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody, PageHeader } from '../components/AdminShell';
import { Reveal, stagger } from '../components/Reveal';
import { Badge, Button, Card, DropdownMenu, EmptyState, MenuItem, Skeleton } from '../components/primitives';
import { SafeImage } from '../components/ui';
import type { AdminBanner } from '../types';
import type { PageProps } from './types';

export function BannersPage({ onNavigate }: PageProps) {
  const { data, loading, error, reload } = useAsync(() => api.getBanners(), []);
  const confirm = useConfirm();
  const toast = useToast();

  const banners = data ?? [];

  const remove = async (banner: AdminBanner) => {
    const ok = await confirm({ message: 'Remove this banner?' });
    if (!ok) return;
    try {
      await api.deleteBanner(banner.id);
      toast('Banner removed', { success: true });
      reload();
    } catch (e) {
      toast(`Delete failed: ${errorMessage(e)}`, { error: true });
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="Banners"
        description={`${banners.filter(b => b.isActive).length} of ${banners.length} showing on the storefront.`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => onNavigate('/banners/new')}>
            New banner
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-0 w-full rounded-none pb-[66%]" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <Card>
          <EmptyState
            icon={NavBanners}
            title={error ? 'Could not load banners' : 'No banners yet'}
            description={error ?? 'Add a hero image to feature on the storefront and in the app.'}
            action={
              error ? undefined : (
                <Button variant="primary" icon={Plus} onClick={() => onNavigate('/banners/new')}>
                  New banner
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {banners.map((banner, i) => (
            <Reveal key={banner.id} delay={stagger(i, 50)}>
              <Card className="group overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border-strong">
                <button
                  type="button"
                  onClick={() => onNavigate(`/banners/${banner.id}`)}
                  className="block w-full"
                  aria-label={`Edit ${banner.title || 'banner'}`}
                >
                  <div className="relative bg-hover" style={{ aspectRatio: 3 / 2 }}>
                    <SafeImage
                      src={banner.imageUrl}
                      alt={banner.title ?? 'Banner'}
                      className="size-full object-cover"
                      fallback={<ImageOff size={24} />}
                    />
                    {!banner.isActive && (
                      <span className="absolute inset-0 grid place-items-center bg-black/55">
                        <Badge color="var(--color-subtle-foreground)">Inactive</Badge>
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex items-start gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-foreground">
                      {banner.title || 'Untitled banner'}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                      <span>{banner.section}</span>
                      <span className="text-subtle-foreground">·</span>
                      <span className="tnum">Order {banner.sortOrder}</span>
                    </p>
                  </div>

                  <DropdownMenu
                    label={`Actions for ${banner.title || 'banner'}`}
                    trigger={
                      <span className="grid size-8 place-items-center rounded-lg text-subtle-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
                        <MoreHorizontal size={16} />
                      </span>
                    }
                  >
                    <MenuItem icon={Pencil} onSelect={() => onNavigate(`/banners/${banner.id}`)}>
                      Edit
                    </MenuItem>
                    <MenuItem icon={Trash} destructive onSelect={() => remove(banner)}>
                      Delete
                    </MenuItem>
                  </DropdownMenu>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </PageBody>
  );
}
