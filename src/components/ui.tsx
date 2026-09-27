/**
 * The pieces specific to this console — dialogs, the OTP relay, upload fields
 * and the image helpers. Everything generic now lives in `primitives.tsx`.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Close,
  Film,
  HardDrive,
  ImageIcon,
  Info,
  Play,
  Ratio,
  Scan,
  Search,
  Spinner,
  Upload,
  type Icon,
} from './icons';
import { Button, Kbd, cx } from './primitives';
import { IMAGE_MIN_HEIGHT, IMAGE_MIN_WIDTH, type ImageSpecs } from '../lib/uploads';

/* ══ LOADING ════════════════════════════════════════════════════════════════*/

export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid place-items-center px-6 py-20" role="status">
      <Spinner size={26} className="animate-spin text-primary" />
      <span className="mt-3 text-[12.5px] text-muted-foreground">{label}</span>
    </div>
  );
}

/* ══ SEARCH ═════════════════════════════════════════════════════════════════*/

/** The table toolbar's search box — compact, inline, not a full-width bar. */
export function SearchInput({
  hint,
  value,
  onChange,
  className,
}: {
  hint: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cx('relative flex min-w-0 items-center', className)}>
      <span className="pointer-events-none absolute left-3 text-subtle-foreground">
        <Search size={15} />
      </span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={hint}
        aria-label={hint}
        className="h-9 w-full rounded-lg border border-input bg-card-raised pl-9 pr-3 text-[13.5px] text-foreground outline-none transition-all duration-200 placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none"
      />
    </div>
  );
}

/* ══ FILTER CHIPS ═══════════════════════════════════════════════════════════*/

/** A segmented control — the web shape for a small, exclusive filter. */
export function FilterChips({
  options,
  active,
  onSelect,
}: {
  options: { value: string; label: string }[];
  active: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card-raised p-0.5">
      {options.map(o => {
        const selected = o.value === active;
        return (
          <button
            key={o.value || 'all'}
            type="button"
            onClick={() => onSelect(o.value)}
            aria-pressed={selected}
            className={cx(
              'rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150',
              selected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-hover hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tabs that sit above a panel. */
export function PillTabs<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="flex items-center gap-6 border-b border-border" role="tablist">
      {tabs.map(t => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(t.id)}
            className={cx(
              'relative -mb-px flex items-center gap-2 border-b-2 px-0.5 pb-3 pt-1 text-[13.5px] font-medium transition-colors duration-150',
              selected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cx(
                  'tnum rounded-full px-1.5 py-px text-[11px]',
                  selected ? 'bg-primary/15 text-primary' : 'bg-hover text-subtle-foreground',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ══ NOTES ══════════════════════════════════════════════════════════════════*/

export function NoteBox({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  const color = tone === 'warning' ? 'var(--color-warning)' : 'var(--color-primary)';
  return (
    <div
      className="flex items-start gap-3 rounded-lg border p-3.5"
      style={{
        borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 7%, transparent)`,
      }}
    >
      <span className="mt-px shrink-0" style={{ color }}>
        <Info size={16} />
      </span>
      <div className="flex-1 text-[12.5px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function HelpBox({ lines }: { lines: string[] }) {
  return (
    <ul className="space-y-2 rounded-lg border border-border bg-hover/40 p-3.5">
      {lines.map(line => (
        <li key={line} className="flex items-start gap-2.5">
          <span className="mt-[7px] size-1 shrink-0 rounded-full bg-subtle-foreground" />
          <span className="flex-1 text-[12.5px] leading-relaxed text-muted-foreground">{line}</span>
        </li>
      ))}
    </ul>
  );
}

/* ══ UPLOAD ═════════════════════════════════════════════════════════════════*/

export function ImageSpecsBox({ specs }: { specs: ImageSpecs }) {
  const rows: [Icon, string][] = [
    [Ratio, `${specs.recWidth} × ${specs.recHeight} px (${specs.ratioLabel})`],
    [Scan, `Minimum ${IMAGE_MIN_WIDTH} × ${IMAGE_MIN_HEIGHT} px`],
    [HardDrive, 'Up to 5 MB'],
    [ImageIcon, 'JPG, PNG or WebP'],
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map(([RowIcon, text]) => (
        <div key={text} className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <span className="shrink-0 text-subtle-foreground">
            <RowIcon size={14} />
          </span>
          {text}
        </div>
      ))}
    </div>
  );
}

export function SpecRow({ icon: RowIcon, text }: { icon: Icon; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
      <span className="shrink-0 text-subtle-foreground">
        <RowIcon size={14} />
      </span>
      {text}
    </div>
  );
}

/** A drop zone that also opens the file picker. */
export function UploadButton({
  uploading,
  onFile,
  label = 'Upload image',
  accept,
}: {
  uploading: boolean;
  onFile: (file: File) => void;
  label?: string;
  accept: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => ref.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={cx(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 transition-all duration-200 disabled:opacity-50',
          dragging
            ? 'border-primary bg-primary/10'
            : 'border-border-strong bg-hover/40 hover:border-primary/50 hover:bg-primary/5',
        )}
      >
        <span className="text-muted-foreground">
          {uploading ? <Spinner size={18} className="animate-spin" /> : <Upload size={18} />}
        </span>
        <span className="text-[13px] font-medium text-foreground">{uploading ? 'Uploading…' : label}</span>
        {!uploading && <span className="text-[11.5px] text-subtle-foreground">or drop a file here</span>}
      </button>
    </>
  );
}

/* ══ DIALOG ═════════════════════════════════════════════════════════════════*/

export function Modal({
  title,
  description,
  icon: TitleIcon,
  accent = 'var(--color-primary)',
  onClose,
  children,
  actions,
  wide = false,
}: {
  title: string;
  description?: string;
  icon?: Icon;
  accent?: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className={cx(
        'fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-[8vh] backdrop-blur-sm transition-opacity duration-200',
        entered ? 'opacity-100' : 'opacity-0',
      )}
      role="dialog"
      aria-modal="true"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cx(
          'floating w-full overflow-hidden rounded-xl transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
          wide ? 'max-w-2xl' : 'max-w-md',
          entered ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0',
        )}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          {TitleIcon && (
            <span
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
              style={{
                color: accent,
                backgroundColor: `color-mix(in srgb, ${accent} 13%, transparent)`,
              }}
            >
              <TitleIcon size={16} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[15.5px] font-semibold tracking-[-0.01em] text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close" icon={Close} />
        </div>

        <div className="px-5 py-5">{children}</div>

        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border px-5 py-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ OTP ════════════════════════════════════════════════════════════════════*/

export function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      autoFocus
      aria-label="OTP"
      placeholder="——————"
      className="tnum h-14 w-full rounded-lg border border-input bg-card-raised text-center font-mono text-2xl font-medium tracking-[0.4em] text-foreground outline-none transition-all duration-200 placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
  );
}

/** The code the operator reads out to the customer. */
export function OtpDisplay({ otp }: { otp: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the code is on screen either way */
    }
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.08] p-5 text-center">
      <p className="tnum font-mono text-[2.25rem] font-medium leading-none tracking-[0.3em] text-primary-soft">
        {otp || '——————'}
      </p>
      {otp && (
        <button
          type="button"
          onClick={copy}
          className="mt-3 text-[12px] font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline"
        >
          {copied ? 'Copied' : 'Copy code'}
        </button>
      )}
    </div>
  );
}

/* ══ IMAGE ══════════════════════════════════════════════════════════════════*/

export function SafeImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span className={cx('grid place-items-center bg-hover text-subtle-foreground', className)}>
        {fallback ?? <ImageIcon size={18} />}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cx('transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0', className)}
    />
  );
}

/** A video thumbnail tile for the product form. */
export function VideoTile({ thumbnailUrl, onRemove }: { thumbnailUrl: string | null; onRemove: () => void }) {
  return (
    <div className="group relative h-24 w-32 overflow-hidden rounded-lg border border-border bg-hover">
      {thumbnailUrl ? (
        <SafeImage src={thumbnailUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center text-subtle-foreground">
          <Film size={22} />
        </span>
      )}
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-8 place-items-center rounded-full bg-black/55 text-white">
          <Play size={15} />
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove video"
        className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-black/65 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <Close size={13} />
      </button>
    </div>
  );
}

export { Kbd };
