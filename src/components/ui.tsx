/**
 * The panel's shared building blocks — a port of dristi-admin-app/lib/widgets.dart.
 *
 * Every component here maps to a Flutter widget of the same job, so the website
 * reads as the same product: BrandHeader, FashionCard, StatTile, Tag, ActionGrid,
 * EmptyBox, BrandLoader, SectionLabel, SearchInput, FashionButton, InfoBlock,
 * FormSection, StyledInput, StyledDropdown, ToggleRow, ListCardShell,
 * ImageSpecsBox and ImageUploadButton.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  HardDrive,
  Image as ImageIcon,
  Info,
  Loader2,
  Menu,
  Pencil,
  Ratio,
  Scan,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IMAGE_MIN_HEIGHT, IMAGE_MIN_WIDTH, type ImageSpecs } from '../lib/uploads';

/* ── BrandHeader ─────────────────────────────────────────────────────────── */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  /** Opens the drawer on compact layouts. Omitted on pushed detail/form pages. */
  onMenu?: () => void;
  /** Shown instead of the hamburger on pushed pages, as BrandHeader's back arrow. */
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, trailing, onMenu, onBack }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 card-surface border-b border-hair-light shadow-sm-soft">
      <div className="flex items-center gap-3 px-5 py-4 sm:gap-4">
        {onMenu && (
          <IconBox label="Open menu" onClick={onMenu} className="lg:hidden">
            <Menu size={18} />
          </IconBox>
        )}
        {onBack && (
          <IconBox label="Go back" onClick={onBack}>
            <ArrowLeft size={18} />
          </IconBox>
        )}
        <img
          src="/logo.jpg"
          alt=""
          className="size-10 shrink-0 rounded-input border border-coral/40 object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-extrabold uppercase leading-none tracking-[2px] text-ink sm:text-2xl sm:tracking-[3px]">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="block h-0.5 w-4 shrink-0 rounded-sm bg-gradient-to-r from-coral to-coral-80" />
              <span className="label-caps truncate text-[10px] tracking-[2.5px] text-muted">{subtitle}</span>
            </div>
          )}
        </div>
        {trailing}
      </div>
      <div className="accent-rainbow h-0.5" />
    </header>
  );
}

/** The 42px bordered square the header uses for its leading/trailing actions. */
export function IconBox({
  children,
  onClick,
  label,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-[42px] shrink-0 place-items-center rounded-lg border border-hair-light card-surface text-ink-soft shadow-sm-soft transition hover:border-coral/40 hover:text-coral ${className}`}
    >
      {children}
    </button>
  );
}

/* ── FashionCard / ListCardShell ─────────────────────────────────────────── */

export function Card({
  children,
  className = '',
  accentColor,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div
      className={`card-surface rounded-card border border-hair-light p-5 shadow-md-soft ${className}`}
    >
      {accentColor && (
        <span
          className="mb-3 block h-[3px] w-8 rounded-sm"
          style={{ backgroundImage: `linear-gradient(90deg, ${accentColor}, transparent)` }}
        />
      )}
      {children}
    </div>
  );
}

/**
 * The white surface, hairline border, 16px radius and soft shadow used by every
 * list screen. `onClick` makes the whole row activatable, as ListCardShell does.
 */
export function ListCard({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const base = `w-full rounded-card border border-hair-light bg-surface p-4 text-left shadow-md-soft ${className}`;
  if (!onClick) return <div className={base}>{children}</div>;
  return (
    <button type="button" onClick={onClick} className={`${base} transition hover:border-coral/40`}>
      {children}
    </button>
  );
}

/* ── Dashboard stat card (dashboard_screen._StatCard) ────────────────────── */

export function StatCard({
  label,
  value,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="plate-royal relative block w-full overflow-hidden rounded-card p-4 text-left shadow-violet transition hover:brightness-105"
    >
      {/* Soft light sheen across the plate */}
      <span className="pointer-events-none absolute -right-2.5 -top-5 size-[90px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.14),transparent_70%)]" />
      <div className="relative flex items-center">
        <span className="grid size-[38px] place-items-center rounded-input border border-white/30 bg-white/20 text-white">
          <Icon size={18} />
        </span>
        <span className="ml-auto text-white/60">
          <ArrowUpRight size={15} />
        </span>
      </div>
      <p className="relative mt-4 font-display text-[27px] font-black tracking-[0.5px] text-white">{value}</p>
      <div className="relative mt-1.5 flex items-center gap-[7px]">
        <span className="block h-0.5 w-3.5 shrink-0 rounded-sm bg-white/70" />
        <span className="label-caps truncate text-[9px] tracking-[1.8px] text-white/85">{label}</span>
      </div>
    </button>
  );
}

/* ── StatTile (widgets.dart) ─────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-stretch overflow-hidden rounded-card border border-hair-light card-surface text-left shadow-sm-soft transition hover:border-coral/40"
    >
      <span className="w-1.5 shrink-0" style={{ backgroundColor: accent }} />
      <span className="flex flex-1 items-center justify-between px-5 py-4">
        <span>
          <span className="block font-display text-[26px] font-black tracking-[1px]" style={{ color: accent }}>
            {value}
          </span>
          <span className="label-caps mt-0.5 block text-[10px] tracking-[2.5px] text-muted">{label}</span>
        </span>
        <span
          className="grid size-10 place-items-center rounded-lg border"
          style={{
            color: accent,
            borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
          }}
        >
          <ChevronRight size={16} />
        </span>
      </span>
    </button>
  );
}

/* ── Tag ─────────────────────────────────────────────────────────────────── */

export function Tag({
  text,
  color,
  filled = false,
}: {
  text: string;
  color: string;
  filled?: boolean;
}) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-[5px]"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} ${filled ? 35 : 40}%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} ${filled ? 14 : 4}%, transparent)`,
      }}
    >
      <span className="block size-[5px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="label-caps truncate text-[9px] font-extrabold tracking-[1.3px]">{text}</span>
    </span>
  );
}

/* ── ActionGrid ──────────────────────────────────────────────────────────── */

export interface ActionItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export function ActionGrid({ items }: { items: ActionItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className="card-surface rounded-card border border-btn-border p-5 text-left shadow-sm-soft transition hover:border-coral hover:shadow-md-soft"
        >
          <span className="grid size-11 place-items-center rounded-input bg-btn text-white shadow-violet">
            <item.icon size={20} />
          </span>
          <span className="label-caps mt-4 block text-[11px] tracking-[2px] text-ink-soft">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── EmptyBox / BrandLoader / DividerLine / SectionLabel ─────────────────── */

export function EmptyBox({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="grid place-items-center px-6 py-12">
      <div className="card-surface flex max-w-sm flex-col items-center rounded-card border border-hair-light p-8 text-center shadow-sm-soft">
        <span className="grid size-[72px] place-items-center rounded-[20px] border border-coral/25 bg-coral/10 text-coral">
          <Icon size={30} />
        </span>
        <p className="label-caps mt-5 text-[11.5px] tracking-[2.5px] text-ink-soft">{message}</p>
        <span className="hairline-violet mt-3.5 block h-0.5 w-10" />
      </div>
    </div>
  );
}

export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid place-items-center px-6 py-16" role="status">
      <span className="grid size-14 place-items-center rounded-full bg-[radial-gradient(circle,rgba(107,56,212,0.14),transparent_70%)] text-coral">
        <Loader2 size={28} className="animate-spin" />
      </span>
      <span className="label-caps mt-4 text-[10px] tracking-[3px] text-muted">{label}</span>
    </div>
  );
}

export function DividerLine() {
  return <hr className="my-3 h-px border-0 bg-hair-light" />;
}

export function SectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 pt-7">
      <span className="block h-[3px] w-6 shrink-0 rounded-sm bg-gradient-to-r from-coral to-coral-80" />
      <span className="label-caps text-[11px] tracking-[1.5px] text-ink-soft">{title}</span>
      <span className="ml-auto block h-px w-14 bg-gradient-to-r from-hair-light to-transparent" />
    </div>
  );
}

/* ── SearchInput ─────────────────────────────────────────────────────────── */

export function SearchInput({
  hint,
  value,
  onChange,
}: {
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md bg-coral/10 text-coral">
        <Search size={16} />
      </span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={hint}
        aria-label={hint}
        className="w-full rounded-btn border border-hair-light bg-surface py-[15px] pl-12 pr-4 text-[13px] text-ink placeholder:text-[11px] placeholder:tracking-[2px] placeholder:text-muted focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
      />
    </div>
  );
}

/* ── FashionButton ───────────────────────────────────────────────────────── */

export function PrimaryButton({
  label,
  onClick,
  loading = false,
  disabled = false,
  icon: Icon,
  color,
  type = 'button',
  className = '',
  full = true,
}: {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  /** A tone override (success / error / teal / info), as FashionButton.color. */
  color?: string;
  type?: 'button' | 'submit';
  className?: string;
  /** FashionButton is full-width; inline uses (the action rows) opt out. */
  full?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2.5 rounded-btn border px-5 text-white transition active:scale-[0.98] disabled:opacity-55 ${
        full ? 'h-[54px] w-full' : 'h-10'
      } ${className}`}
      style={{
        backgroundColor: color ?? 'var(--color-btn)',
        borderColor: color
          ? `color-mix(in srgb, ${color} 75%, black)`
          : 'color-mix(in srgb, var(--color-coral-dark) 35%, transparent)',
        boxShadow: `0 10px 20px color-mix(in srgb, ${color ?? 'var(--color-coral)'} 18%, transparent)`,
      }}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={17} />}
          <span className={`label-caps font-extrabold ${full ? 'text-[12.5px] tracking-[3.5px]' : 'text-[10px] tracking-[1.5px]'}`}>
            {label}
          </span>
        </>
      )}
    </button>
  );
}

/** The violet edit square used on every list row. */
export function EditButton({ onClick, label = 'Edit' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-lg bg-btn text-white shadow-violet transition hover:brightness-110"
    >
      <Pencil size={15} />
    </button>
  );
}

/** The red delete square used on every list row. */
export function DeleteButton({ onClick, label = 'Delete' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-error bg-error text-white transition hover:brightness-110"
    >
      <Trash2 size={15} />
    </button>
  );
}

/** The circular add affordance every list screen floats bottom-right. */
export function FloatingAction({
  onClick,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="fixed bottom-6 right-6 z-40 grid size-14 place-items-center rounded-2xl bg-btn text-white shadow-violet transition hover:brightness-110"
    >
      <Icon size={24} />
    </button>
  );
}

/* ── InfoBlock ───────────────────────────────────────────────────────────── */

export function InfoBlock({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="label-caps w-[90px] shrink-0 pt-1.5 text-[9px] tracking-[2px] text-muted">{label}</span>
      <span
        className="flex-1 rounded-md border border-hair bg-bg-alt px-3 py-1.5 text-[13px] font-semibold"
        style={{ color: valueColor ?? 'var(--color-ink)' }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── FormSection ─────────────────────────────────────────────────────────── */

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 pb-3.5 pl-1">
        <span className="block h-[3px] w-5 shrink-0 rounded-sm bg-gradient-to-r from-coral to-coral-80" />
        <h2 className="label-caps text-[11px] tracking-[1.5px] text-ink-soft">{title}</h2>
      </div>
      <div className="card-surface rounded-card border border-hair-light p-5 shadow-md-soft">{children}</div>
    </section>
  );
}

/* ── StyledInput / StyledDropdown ────────────────────────────────────────── */

const FIELD_CLASS =
  'w-full rounded-input border bg-bg-alt px-4 py-[13px] text-[13px] font-semibold text-ink placeholder:font-normal placeholder:text-[11px] placeholder:text-muted focus:outline-none focus:ring-1';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  number?: boolean;
  multiline?: number;
  required?: boolean;
  error?: string | null;
  icon?: LucideIcon;
  type?: 'text' | 'password' | 'email';
  autoComplete?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  hint,
  number = false,
  multiline,
  required = false,
  error,
  icon: Icon,
  type = 'text',
  autoComplete,
}: TextInputProps) {
  const id = useId();
  const borderColor = error ? 'var(--color-error)' : 'var(--color-hair)';
  const ringClass = error ? 'focus:border-error focus:ring-error' : 'focus:border-coral focus:ring-coral';

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold tracking-[1.2px] text-muted">
        {label}
        {required && <span className="text-coral"> *</span>}
      </label>
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute left-2.5 top-2 grid size-[34px] place-items-center rounded-[7px] bg-coral/10 text-coral">
            <Icon size={16} />
          </span>
        )}
        {multiline ? (
          <textarea
            id={id}
            rows={multiline}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={hint}
            className={`${FIELD_CLASS} ${ringClass} resize-y`}
            style={{ borderColor }}
          />
        ) : (
          <input
            id={id}
            type={number ? 'number' : type}
            inputMode={number ? 'decimal' : undefined}
            step={number ? 'any' : undefined}
            value={value}
            autoComplete={autoComplete}
            onChange={e => onChange(e.target.value)}
            placeholder={hint}
            className={`${FIELD_CLASS} ${ringClass} ${Icon ? 'pl-[52px]' : ''}`}
            style={{ borderColor }}
          />
        )}
      </div>
      {error && <p className="mt-1 text-[10.5px] font-semibold text-error">{error}</p>}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  /** Renders the option indented, as the subcategory rows in the product form. */
  indent?: boolean;
}

export function Select({
  label,
  value,
  options,
  onChange,
  required = false,
  error,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  required?: boolean;
  error?: string | null;
}) {
  const id = useId();
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold tracking-[1.2px] text-muted">
        {label}
        {required && <span className="text-coral"> *</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${FIELD_CLASS} ${error ? 'focus:border-error focus:ring-error' : 'focus:border-coral focus:ring-coral'} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b38d4%22 stroke-width=%222.5%22 stroke-linecap=%22round%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-10`}
        style={{ borderColor: error ? 'var(--color-error)' : 'var(--color-hair)' }}
      >
        {options.map(o => (
          <option key={`${o.value}-${o.label}`} value={o.value}>
            {o.indent ? `⤷ ${o.label}` : o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[10.5px] font-semibold text-error">{error}</p>}
    </div>
  );
}

/* ── ToggleRow ───────────────────────────────────────────────────────────── */

export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="inline-flex items-center gap-2.5 rounded-input border px-3 py-2 transition"
      style={{
        borderColor: value ? 'color-mix(in srgb, var(--color-coral) 35%, transparent)' : 'var(--color-hair)',
        backgroundColor: value ? 'color-mix(in srgb, var(--color-coral) 8%, transparent)' : 'var(--color-bg-alt)',
      }}
    >
      <span
        className="relative block h-5 w-9 shrink-0 rounded-full transition"
        style={{
          backgroundColor: value
            ? 'color-mix(in srgb, var(--color-coral) 50%, transparent)'
            : 'color-mix(in srgb, var(--color-muted) 20%, transparent)',
        }}
      >
        <span
          className="absolute top-0.5 block size-4 rounded-full shadow-sm-soft transition-all"
          style={{
            left: value ? '1.125rem' : '0.125rem',
            backgroundColor: value ? 'var(--color-coral)' : '#ffffff',
          }}
        />
      </span>
      <span
        className="label-caps text-[9px] tracking-[1.5px]"
        style={{ color: value ? 'var(--color-coral)' : 'var(--color-muted)' }}
      >
        {label}
      </span>
    </button>
  );
}

/* ── Notes & help boxes ──────────────────────────────────────────────────── */

/** The violet info panel used for the GST note, rule previews and help text. */
export function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-btn/30 bg-btn/5 p-3.5">
      <span className="shrink-0 pt-0.5 text-btn">
        <Info size={16} />
      </span>
      <div className="flex-1 text-xs leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

/** payment_method_form_screen._HelpBox — a bulleted list of muted hints. */
export function HelpBox({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-lg border border-coral/25 bg-coral/5 p-3">
      {lines.map(line => (
        <div key={line} className="mb-1 flex items-start gap-2 last:mb-0">
          <span className="shrink-0 pt-0.5 text-muted">
            <Info size={15} />
          </span>
          <p className="flex-1 text-[12.5px] text-muted">{line}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Pill tabs (referrals / messages) ────────────────────────────────────── */

export function PillTabs<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="flex gap-2" role="tablist">
      {tabs.map(t => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(t.id)}
            className={`label-caps flex-1 rounded-lg border py-2.5 text-[10px] tracking-[1.2px] transition ${
              selected
                ? 'border-coral bg-gradient-to-br from-coral to-coral-80 text-white'
                : 'border-hair bg-surface-alt text-ink-soft hover:border-coral/40'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** The All / Men / Women / Kids filter row on the products and categories pages. */
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
    <div className="flex gap-2">
      {options.map(o => {
        const selected = o.value === active;
        return (
          <button
            key={o.value || 'all'}
            type="button"
            onClick={() => onSelect(o.value)}
            aria-pressed={selected}
            className={`flex-1 rounded-[9px] border py-2.5 text-xs font-bold tracking-[1px] transition ${
              selected
                ? 'border-coral-dark/35 bg-btn text-white shadow-violet'
                : 'border-hair-light bg-surface-alt text-ink-soft hover:border-coral/40'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── ImageSpecsBox / ImageUploadButton ───────────────────────────────────── */

export function ImageSpecsBox({ specs }: { specs: ImageSpecs }) {
  const rows: [LucideIcon, string][] = [
    [Ratio, `Recommended: ${specs.recWidth} × ${specs.recHeight} px (${specs.ratioLabel})`],
    [Scan, `Minimum: ${IMAGE_MIN_WIDTH} × ${IMAGE_MIN_HEIGHT} px`],
    [HardDrive, 'Max file size: 5 MB'],
    [ImageIcon, 'Formats: JPG, PNG, WebP'],
  ];
  return (
    <div className="rounded-lg border border-coral/25 bg-coral/5 p-3">
      <p className="text-[13px] font-semibold text-ink">Image requirements</p>
      <div className="mt-2">
        {rows.map(([Icon, text]) => (
          <div key={text} className="mb-1 flex items-center gap-2 last:mb-0">
            <span className="shrink-0 text-muted">
              <Icon size={15} />
            </span>
            <p className="text-[12.5px] text-muted">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A spec row for the Videos section, which lists its own rules. */
export function SpecRow({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="mb-1 flex items-center gap-2 last:mb-0">
      <span className="shrink-0 text-muted">
        <Icon size={15} />
      </span>
      <p className="text-[12.5px] text-muted">{text}</p>
    </div>
  );
}

/**
 * The upload affordance every image/video field uses. A hidden `<input type=file>`
 * stands in for Flutter's ImagePicker; the caller gets the chosen File.
 */
export function UploadButton({
  uploading,
  onFile,
  label = 'Upload Image',
  accept,
}: {
  uploading: boolean;
  onFile: (file: File) => void;
  label?: string;
  accept: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          // Reset so picking the same file twice still fires a change event.
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-input border border-coral py-3.5 text-sm font-semibold text-coral transition hover:bg-coral/5 disabled:opacity-60"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={18} />}
        {uploading ? 'Uploading…' : label}
      </button>
    </>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────── */

/**
 * The panel's dialog shell, matching Flutter's AlertDialog theme (surface,
 * 16px radius, violet hairline). Escape and a backdrop click both dismiss.
 */
export function Modal({
  title,
  icon: Icon,
  accent = 'var(--color-coral)',
  onClose,
  children,
  actions,
  wide = false,
}: {
  title: string;
  icon?: LucideIcon;
  accent?: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/35 p-4 py-10"
      role="dialog"
      aria-modal="true"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full rounded-card border border-coral/20 bg-surface shadow-lg-soft ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className="flex items-center gap-2.5 border-b border-hair-light px-5 py-4">
          {Icon && (
            <span
              className="grid size-8 place-items-center rounded-md"
              style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`, color: accent }}
            >
              <Icon size={16} />
            </span>
          )}
          <h2 className="flex-1 font-display text-[15px] font-extrabold tracking-[1px]" style={{ color: accent }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-muted transition hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hair-light px-5 py-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/** The muted "Cancel" button every dialog pairs with its primary action. */
export function GhostButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="label-caps rounded-input border border-hair-light bg-surface-alt px-[18px] py-2.5 text-[10px] tracking-[2px] text-ink-soft transition hover:bg-bg-alt disabled:opacity-50"
    >
      {label}
    </button>
  );
}

/**
 * The centred 6-digit OTP field used by the delivery and return dialogs.
 * Non-digits are dropped as they are typed, so the value is always submittable.
 */
export function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      aria-label="OTP"
      className="w-full rounded-input border border-hair bg-bg-alt py-3 text-center text-xl font-extrabold tracking-[6px] text-ink focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
    />
  );
}

/** The big violet OTP readout the dispatch / approve dialogs display. */
export function OtpDisplay({ otp }: { otp: string }) {
  return (
    <div className="grid place-items-center">
      <span className="rounded-input border border-hair bg-bg-alt px-5 py-3 text-[28px] font-black tracking-[8px] text-coral">
        {otp || '——————'}
      </span>
    </div>
  );
}

/**
 * An image that falls back to a placeholder instead of a browser-broken icon.
 * Stands in for CachedNetworkImage's `errorWidget`.
 */
export function SafeImage({
  src,
  alt,
  className = '',
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <span className={`grid place-items-center bg-bg-alt text-muted ${className}`}>
        {fallback ?? <ImageIcon size={20} />}
      </span>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}
