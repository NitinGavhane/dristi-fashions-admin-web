/**
 * Live "how will my banner be cropped?" preview for the Banner form — a port of
 * BannerCropPreview in dristi-admin-app/lib/widgets.dart.
 *
 * The same single image is shown in the Phone app's auto-sliding slider and on
 * the Website hero. Both render with a cover-crop (an exact fit, cropping
 * whatever doesn't fit) but at different frame ratios:
 *   • Phone slider         ≈ 3:2  (full-width × ~35% of the screen height)
 *   • Website desktop hero ≈ 16:7 (up to 1280px wide × 560px tall)
 *
 * This reads the real pixel size of the uploaded image and shows the exact crop
 * each surface will apply, plus a centre "safe zone" overlay. Text, faces,
 * products and logos should sit inside that highlighted area so nothing
 * important gets cut on either device.
 */
import { useEffect, useState } from 'react';
import { ImageOff, ImagePlus, Loader2, Scissors, SlidersHorizontal } from 'lucide-react';

/** Frame ratios the cover-image must fill, matching the real front-ends. */
const PHONE_RATIO = 3 / 2; // user-app HeroBanner slider
const WEB_RATIO = 16 / 7; // website HeroCarousel desktop (1280×560)

interface Dimensions {
  width: number;
  height: number;
}

type DecodeState = { status: 'idle' } | { status: 'decoding' } | { status: 'done'; size: Dimensions } | { status: 'failed' };

export function BannerCropPreview({ imageUrl }: { imageUrl: string }) {
  const [state, setState] = useState<DecodeState>({ status: 'idle' });

  useEffect(() => {
    const url = imageUrl.trim();
    if (!url) {
      setState({ status: 'idle' });
      return;
    }

    let live = true;
    setState({ status: 'decoding' });

    const img = new Image();
    // The S3 bucket serves these publicly; anonymous mode avoids a cookie
    // round-trip and keeps the load identical to what a visitor gets.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!live) return;
      setState({ status: 'done', size: { width: img.naturalWidth, height: img.naturalHeight } });
    };
    img.onerror = () => {
      if (!live) return;
      setState({ status: 'failed' });
    };
    img.src = url;

    return () => {
      live = false;
    };
  }, [imageUrl]);

  const hasImage = imageUrl.trim().length > 0;

  return (
    <div className="rounded-input border border-hair-light bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="text-coral">
          <Scissors size={16} />
        </span>
        <p className="text-[13px] font-semibold text-ink">How your banner is cropped</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        The same image feeds the App slider and the Website hero, sized differently on each. What&apos;s shown
        below is exactly the crop each device would apply. Keep text, faces and products inside the highlighted
        centre area.
      </p>

      {!hasImage ? (
        <div className="mt-3 grid place-items-center rounded-lg border border-hair-light bg-surface-alt px-4 py-6 text-muted">
          <ImagePlus size={28} />
          <p className="mt-2 text-[12.5px]">Upload an image to preview the crop</p>
        </div>
      ) : state.status === 'decoding' ? (
        <div className="mt-3 grid place-items-center py-5 text-coral">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : state.status === 'done' ? (
        <>
          <DimensionNote size={state.size} />
          <div className="mt-3 space-y-3.5">
            <SurfaceFrame
              label="Phone app — auto slider"
              ratio={PHONE_RATIO}
              ratioLabel="3:2"
              note={cropNote(state.size, PHONE_RATIO)}
              imageUrl={imageUrl}
            />
            <SurfaceFrame
              label="Website — hero banner"
              ratio={WEB_RATIO}
              ratioLabel="16:7"
              note={cropNote(state.size, WEB_RATIO)}
              imageUrl={imageUrl}
            />
          </div>
        </>
      ) : (
        <div className="mt-3 flex items-center justify-center gap-2 py-5 text-muted">
          <ImageOff size={16} />
          <p className="text-[12.5px]">Couldn&apos;t read the image dimensions.</p>
        </div>
      )}
    </div>
  );
}

function DimensionNote({ size }: { size: Dimensions }) {
  const ratio = size.width / size.height;
  const match =
    ratio < PHONE_RATIO ? 'taller than recommended' : ratio <= WEB_RATIO ? 'a good match' : 'wider than recommended';

  return (
    <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-coral/25 bg-coral/5 px-2.5 py-2">
      <span className="shrink-0 text-coral">
        <SlidersHorizontal size={15} />
      </span>
      <p className="text-xs text-ink-soft">
        Your image: {Math.round(size.width)} × {Math.round(size.height)} px ({match}). Recommended: 1920 × 1080 px
        (16:9) or wider.
      </p>
    </div>
  );
}

/** Percentage caption describing how much of the source survives this crop. */
function cropNote(size: Dimensions, targetRatio: number): string {
  const srcRatio = size.width / size.height;
  // cover: the dimension that fills is fully shown; the other is cropped.
  if (srcRatio > targetRatio) {
    // Source wider than the frame → the width crops, full height is shown.
    const visibleWidth = targetRatio * size.height;
    const pct = Math.round(Math.min(1, visibleWidth / size.width) * 100);
    return `Shows ${pct}% of the width (sides cropped), 100% of the height.`;
  }
  if (srcRatio < targetRatio) {
    const visibleHeight = size.width / targetRatio;
    const pct = Math.round(Math.min(1, visibleHeight / size.height) * 100);
    return `Shows 100% of the width, ${pct}% of the height (top/bottom cropped).`;
  }
  return 'Shows the full image on this surface.';
}

function SurfaceFrame({
  label,
  ratio,
  ratioLabel,
  note,
  imageUrl,
}: {
  label: string;
  ratio: number;
  ratioLabel: string;
  note: string;
  imageUrl: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[12.5px] font-semibold text-ink-soft">{label}</p>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-muted">{ratioLabel}</span>
      </div>
      <div className="relative mt-2 overflow-hidden rounded-lg bg-surface-alt" style={{ aspectRatio: ratio }}>
        <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        <SafeZoneOverlay />
        <div className="absolute inset-x-2 bottom-1.5 flex justify-center">
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">{note}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Dims the frame except a centre safe zone (60% of width × 50% of height) and
 * draws a gold dashed border around it — _SafeZonePainter, in CSS.
 */
function SafeZoneOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* The dim is a single element with a transparent centre punched out by an
          inset box-shadow, so there are no seams between four rectangles. */}
      <div
        className="absolute left-[20%] top-[25%] h-1/2 w-3/5 border-2 border-dashed"
        style={{
          borderColor: '#d4af37',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.42)',
        }}
      >
        <span className="absolute left-1.5 top-1 text-[9px] font-bold tracking-[1px]" style={{ color: '#d4af37' }}>
          SAFE ZONE
        </span>
      </div>
    </div>
  );
}
