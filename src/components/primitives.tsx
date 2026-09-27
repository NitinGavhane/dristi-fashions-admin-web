/**
 * The component library — shadcn/Next.js vocabulary, built for this console.
 *
 * Button, Badge, Input, Select, Switch, Textarea, Card, DropdownMenu, Tooltip,
 * Skeleton, Separator, Kbd, EmptyState. Everything is token-driven, so both
 * themes come free, and everything is keyboard-reachable.
 *
 * These replace the app-shaped widgets the console started with — a phone's
 * full-width pill button and stacked card rows do not belong in a web admin.
 */
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Check, ChevronDown, Spinner, type Icon } from './icons';

/** Joins class names, dropping the falsy ones. */
export const cx = (...parts: unknown[]) =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');

/* ══ BUTTON ═════════════════════════════════════════════════════════════════*/

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'plate-primary text-primary-foreground hover:brightness-110 border border-primary-deep/40',
  secondary:
    'bg-card-raised text-foreground border border-border hover:bg-hover hover:border-border-strong',
  outline:
    'bg-transparent text-foreground border border-border hover:bg-hover hover:border-border-strong',
  ghost:
    'bg-transparent text-muted-foreground border border-transparent hover:bg-hover hover:text-foreground',
  destructive:
    'bg-destructive text-white border border-destructive/60 hover:brightness-110',
  success:
    'bg-success text-[#04140d] border border-success/60 hover:brightness-110',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-[13.5px] gap-2 rounded-lg',
  lg: 'h-11 px-6 text-[15px] gap-2.5 rounded-xl',
  icon: 'size-9 rounded-lg',
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: Icon;
  /** Renders after the label — use for chevrons and arrows. */
  iconRight?: Icon;
  children?: ReactNode;
  full?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: LeftIcon,
  iconRight: RightIcon,
  children,
  full = false,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const iconSize = size === 'lg' ? 17 : 15;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium tracking-[-0.01em]',
        'transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
    >
      {loading ? (
        <Spinner size={iconSize} className="animate-spin" />
      ) : (
        LeftIcon && <LeftIcon size={iconSize} />
      )}
      {children}
      {RightIcon && !loading && <RightIcon size={iconSize} />}
    </button>
  );
}

/* ══ BADGE ══════════════════════════════════════════════════════════════════*/

export function Badge({
  children,
  color,
  variant = 'soft',
  className,
}: {
  children: ReactNode;
  /** Any CSS colour; defaults to the muted foreground. */
  color?: string;
  variant?: 'soft' | 'outline' | 'dot';
  className?: string;
}) {
  const tone = color ?? 'var(--color-muted-foreground)';
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-medium',
        className,
      )}
      style={{
        color: tone,
        backgroundColor: variant === 'outline' ? 'transparent' : `color-mix(in srgb, ${tone} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} ${variant === 'outline' ? 35 : 22}%, transparent)`,
      }}
    >
      {variant === 'dot' && (
        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone }} />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

/* ══ FORM FIELDS ════════════════════════════════════════════════════════════*/

export function Label({
  children,
  htmlFor,
  required,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {hint && <span className="text-[11.5px] text-subtle-foreground">{hint}</span>}
    </div>
  );
}

const FIELD_BASE =
  'w-full rounded-lg border bg-card-raised px-3 text-[14px] text-foreground transition-all duration-200 ' +
  'placeholder:text-subtle-foreground focus:outline-none focus:border-primary ' +
  'focus:ring-2 focus:ring-primary/20 disabled:opacity-50';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string | null;
  hint?: string;
  description?: string;
  icon?: Icon;
  /** Renders inside the field's right edge — units, a visibility toggle. */
  suffix?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  description,
  icon: LeftIcon,
  suffix,
  className,
  id,
  ...rest
}: FieldProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={fieldId} required={rest.required} hint={hint}>
          {label}
        </Label>
      )}
      <div className="relative flex items-center">
        {LeftIcon && (
          <span className="pointer-events-none absolute left-3 text-subtle-foreground">
            <LeftIcon size={15} />
          </span>
        )}
        <input
          {...rest}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          className={cx(
            FIELD_BASE,
            'h-9',
            LeftIcon && 'pl-9',
            suffix && 'pr-10',
            error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-input',
            rest.type === 'number' && 'tnum',
            className,
          )}
        />
        {suffix && <span className="absolute right-2 flex items-center">{suffix}</span>}
      </div>
      {description && !error && <p className="mt-1.5 text-[12px] text-subtle-foreground">{description}</p>}
      {error && <p className="mt-1.5 text-[12px] font-medium text-destructive">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  description,
  className,
  id,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & {
  label?: string;
  error?: string | null;
  hint?: string;
  description?: string;
}) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={fieldId} required={rest.required} hint={hint}>
          {label}
        </Label>
      )}
      <textarea
        {...rest}
        id={fieldId}
        className={cx(
          FIELD_BASE,
          'resize-y py-2.5 leading-relaxed',
          error ? 'border-destructive' : 'border-input',
          className,
        )}
      />
      {description && !error && <p className="mt-1.5 text-[12px] text-subtle-foreground">{description}</p>}
      {error && <p className="mt-1.5 text-[12px] font-medium text-destructive">{error}</p>}
    </div>
  );
}

export interface Option {
  value: string;
  label: string;
  /** Renders the row indented — subcategories under their parent. */
  indent?: boolean;
}

export function Select({
  label,
  error,
  hint,
  description,
  options,
  className,
  id,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  label?: string;
  error?: string | null;
  hint?: string;
  description?: string;
  options: Option[];
}) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={fieldId} required={rest.required} hint={hint}>
          {label}
        </Label>
      )}
      <div className="relative">
        <select
          {...rest}
          id={fieldId}
          className={cx(
            FIELD_BASE,
            'h-9 cursor-pointer appearance-none pr-9',
            error ? 'border-destructive' : 'border-input',
            '[&>option]:bg-[var(--color-popover)] [&>option]:text-[var(--color-foreground)]',
            className,
          )}
        >
          {options.map(o => (
            <option key={`${o.value}-${o.label}`} value={o.value}>
              {o.indent ? `  ⤷ ${o.label}` : o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground">
          <ChevronDown size={14} />
        </span>
      </div>
      {description && !error && <p className="mt-1.5 text-[12px] text-subtle-foreground">{description}</p>}
      {error && <p className="mt-1.5 text-[12px] font-medium text-destructive">{error}</p>}
    </div>
  );
}

/** A labelled switch row — the web shape, not the phone's pill. */
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[13.5px] font-medium text-foreground">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[12px] leading-relaxed text-subtle-foreground">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
          checked ? 'bg-primary' : 'bg-border-strong',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

/** Checkbox used by table row selection. */
export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={e => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cx(
        'grid size-[17px] shrink-0 place-items-center rounded-[5px] border transition-all duration-150',
        checked || indeterminate
          ? 'border-primary bg-primary text-white'
          : 'border-border-strong bg-transparent hover:border-primary/60',
      )}
    >
      {indeterminate ? (
        <span className="h-px w-2 bg-current" />
      ) : checked ? (
        <Check size={11} />
      ) : null}
    </button>
  );
}

/* ══ CARD ═══════════════════════════════════════════════════════════════════*/

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('elevated rounded-xl', className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex items-start justify-between gap-4 border-b border-border px-5 py-4', className)}>
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
        {description && <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('p-5', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-center justify-end gap-2 border-t border-border px-5 py-3.5', className)}>
      {children}
    </div>
  );
}

/* ══ DROPDOWN MENU ══════════════════════════════════════════════════════════
   Row actions live behind one trigger instead of a row of naked icon buttons.
   Closes on outside click, Escape, and on any item activation. */

interface MenuContext {
  close: () => void;
}
const MenuCtx = createContext<MenuContext>({ close: () => {} });

export function DropdownMenu({
  trigger,
  children,
  align = 'end',
  label,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className="contents"
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={cx(
            'floating animate-pop absolute z-50 mt-1.5 min-w-[11rem] rounded-xl p-1',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          <MenuCtx.Provider value={{ close: () => setOpen(false) }}>{children}</MenuCtx.Provider>
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onSelect,
  icon: ItemIcon,
  destructive = false,
  shortcut,
}: {
  children: ReactNode;
  onSelect: () => void;
  icon?: Icon;
  destructive?: boolean;
  shortcut?: string;
}) {
  const { close } = useContext(MenuCtx);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={e => {
        e.stopPropagation();
        close();
        onSelect();
      }}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors duration-150',
        destructive
          ? 'text-destructive hover:bg-destructive/12'
          : 'text-muted-foreground hover:bg-hover hover:text-foreground',
      )}
    >
      {ItemIcon && <ItemIcon size={15} />}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-subtle-foreground">
      {children}
    </div>
  );
}

/* ══ MISC ═══════════════════════════════════════════════════════════════════*/

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-card-raised px-1.5 py-px font-sans text-[10.5px] font-medium text-subtle-foreground">
      {children}
    </kbd>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-border', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton h-4 w-full', className)} />;
}

/** A tooltip that costs nothing — the native title, with a consistent delay. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span className="floating pointer-events-none absolute -top-1 left-1/2 z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md px-2 py-1 text-[11.5px] font-medium text-foreground opacity-0 transition-opacity duration-150 group-hover/tt:opacity-100">
        {label}
      </span>
    </span>
  );
}

export function EmptyState({
  icon: StateIcon,
  title,
  description,
  action,
}: {
  icon: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="grid size-12 place-items-center rounded-xl border border-border bg-card-raised text-muted-foreground">
        <StateIcon size={22} />
      </span>
      <h3 className="mt-4 font-display text-[16px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Section heading inside a page — smaller than the page title, above a block. */
export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[17px] font-semibold tracking-[-0.015em] text-foreground">{title}</h2>
        {description && <p className="mt-1 text-[12.5px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
