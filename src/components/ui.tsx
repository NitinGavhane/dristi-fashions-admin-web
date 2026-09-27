/**
 * The console's building blocks — Ethereal Glass.
 *
 * Two rules hold the whole system together:
 *
 *  1. Nothing sits flat on the background. Every card, field and tile is a
 *     Double-Bezel: an outer tray (`.bezel`) holding an inner glass plate
 *     (`.bezel-core`), with concentric radii, so it reads as machined hardware.
 *  2. Nothing changes state instantly. Every transition rides the same spring
 *     (`--ease-spring`), so the panel feels like one object with mass.
 *
 * The component names are unchanged from the light build on purpose — the 20
 * pages compose these and did not have to be rewritten.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Close,
  HardDrive,
  ImageIcon,
  Indent,
  Info,
  Pencil,
  Ratio,
  Scan,
  Search,
  Spinner,
  Trash,
  Upload,
  type Icon,
} from './icons';
import { IMAGE_MIN_HEIGHT, IMAGE_MIN_WIDTH, type ImageSpecs } from '../lib/uploads';

/* ══ PAGE HEADER ════════════════════════════════════════════════════════════
   Not a sticky bar glued to the top — a floating glass island, detached from
   the viewport edge, that shrinks its own padding as the page scrolls. */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onMenu?: () => void;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, trailing, onMenu, onBack }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-8 sm:pt-6">
      <div className="glass mx-auto flex max-w-[1180px] items-center gap-4 rounded-[1.75rem] px-4 py-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] sm:px-6 sm:py-4">
        {onMenu && (
          <IconButton label="Open menu" onClick={onMenu} className="lg:hidden">
            <MenuGlyph open={false} />
          </IconButton>
        )}
        {onBack && (
          <IconButton label="Go back" onClick={onBack}>
            <ArrowLeft size={17} />
          </IconButton>
        )}

        <div className="min-w-0 flex-1">
          {subtitle && <Eyebrow>{subtitle}</Eyebrow>}
          <h1 className="truncate font-display text-[1.35rem] font-semibold leading-[1.15] tracking-[-0.01em] text-ink sm:text-[1.75rem]">
            {title}
          </h1>
        </div>

        {trailing}
      </div>
    </header>
  );
}

/** The microscopic pill that precedes every major heading. */
export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-hair bg-white/[0.03] px-2.5 py-[3px] text-[10px] font-medium uppercase tracking-[0.2em] text-muted ${className}`}
    >
      {children}
    </span>
  );
}

/** The hamburger's two lines, which rotate into a perfect X rather than vanish. */
export function MenuGlyph({ open }: { open: boolean }) {
  const bar =
    'absolute left-1/2 h-px w-[15px] -translate-x-1/2 bg-current transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]';
  return (
    <span className="relative block size-[17px]" aria-hidden>
      <span className={`${bar} ${open ? 'top-1/2 rotate-45' : 'top-[5px] rotate-0'}`} />
      <span className={`${bar} ${open ? 'top-1/2 -rotate-45' : 'top-[11px] rotate-0'}`} />
    </span>
  );
}

/** A hairline-framed square action. Presses inward on click. */
export function IconButton({
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
      className={`grid size-10 shrink-0 place-items-center rounded-full border border-hair bg-white/[0.03] text-ink-soft transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-hair-strong hover:bg-white/[0.07] hover:text-ink active:scale-[0.94] ${className}`}
    >
      {children}
    </button>
  );
}

/* ══ SURFACES ═══════════════════════════════════════════════════════════════*/

/** The Double-Bezel card. `accentColor` lights its top edge. */
export function Card({
  children,
  className = '',
  accentColor,
  innerClassName = '',
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  innerClassName?: string;
}) {
  return (
    <div className={`bezel ${className}`}>
      <div className={`bezel-core relative overflow-hidden p-6 ${innerClassName}`}>
        {accentColor && (
          <span
            className="absolute inset-x-6 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
          />
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * A list row. Tighter bezel than a card, and it lifts a little on hover so a
 * long list still feels responsive under the cursor.
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
  const shell = `bezel bezel-sm group transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${className}`;
  const core = 'bezel-core p-4 sm:p-5';

  if (!onClick) {
    return (
      <div className={shell}>
        <div className={core}>{children}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${shell} block w-full text-left hover:-translate-y-0.5 hover:border-hair-strong active:scale-[0.995]`}
    >
      <div className={`${core} transition-colors duration-500 group-hover:bg-white/[0.02]`}>{children}</div>
    </button>
  );
}

/* ══ STAT TILES ═════════════════════════════════════════════════════════════*/

/**
 * The dashboard's hero tile. Violet plate, oversized tabular figure, and a
 * nested arrow that drifts diagonally on hover.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  onClick,
  tall = false,
}: {
  label: string;
  value: string;
  icon: Icon;
  onClick?: () => void;
  tall?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bezel group h-full w-full text-left transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 active:scale-[0.985]"
    >
      <div
        className={`bezel-core plate-accent relative flex h-full flex-col justify-between overflow-hidden p-6 ${tall ? 'min-h-[13rem]' : 'min-h-[9.5rem]'}`}
      >
        {/* Sheen sweep on hover */}
        <span className="sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        {/* Corner bloom */}
        <span className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22),transparent_70%)]" />

        <div className="relative flex items-start justify-between">
          <span className="grid size-10 place-items-center rounded-full border border-white/25 bg-white/15 text-white">
            <Icon size={18} />
          </span>
          <span className="grid size-8 place-items-center rounded-full bg-white/15 text-white/80 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[2px] group-hover:scale-105 group-hover:bg-white/25">
            <ArrowUpRight size={15} />
          </span>
        </div>

        <div className="relative">
          <p className={`tnum font-display font-semibold tracking-[-0.03em] text-white ${tall ? 'text-[3.25rem] leading-[0.95]' : 'text-[2.5rem] leading-none'}`}>
            {value}
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/70">{label}</p>
        </div>
      </div>
    </button>
  );
}

/** The quieter variant — dark glass instead of the violet plate. */
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
      className="bezel group h-full w-full text-left transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1"
    >
      <div className="bezel-core relative flex h-full min-h-[9.5rem] flex-col justify-between overflow-hidden p-6">
        <span
          className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full opacity-40 transition-opacity duration-700 group-hover:opacity-70"
          style={{ background: `radial-gradient(circle, ${accent}, transparent 68%)` }}
        />
        <span className="relative grid size-9 place-items-center rounded-full border border-hair" style={{ color: accent }}>
          <ChevronRight size={15} />
        </span>
        <div className="relative">
          <p className="tnum font-display text-[2.25rem] font-semibold leading-none tracking-[-0.03em]" style={{ color: accent }}>
            {value}
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted">{label}</p>
        </div>
      </div>
    </button>
  );
}

/* ══ TAG ════════════════════════════════════════════════════════════════════*/

export function Tag({ text, color, filled = false }: { text: string; color: string; filled?: boolean }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-[3px] backdrop-blur-[2px]"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} ${filled ? 40 : 22}%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} ${filled ? 16 : 8}%, transparent)`,
      }}
    >
      <span className="size-1 shrink-0 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="truncate text-[9.5px] font-medium uppercase tracking-[0.14em]">{text}</span>
    </span>
  );
}

/* ══ ACTION GRID ════════════════════════════════════════════════════════════*/

export interface ActionItem {
  label: string;
  icon: Icon;
  onClick: () => void;
}

export function ActionGrid({ items }: { items: ActionItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className="bezel bezel-sm group text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-hair-strong active:scale-[0.985]"
        >
          <div className="bezel-core flex items-center gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-hair bg-white/[0.04] text-accent-bright transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:border-accent/40 group-hover:bg-accent/15">
              <item.icon size={19} />
            </span>
            <span className="flex-1 text-sm font-medium tracking-[-0.01em] text-ink">{item.label}</span>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.04] text-muted transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[2px] group-hover:bg-white/[0.1] group-hover:text-ink">
              <ArrowUpRight size={13} />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ══ STATES ═════════════════════════════════════════════════════════════════*/

export function EmptyBox({ icon: Icon, message }: { icon: Icon; message: string }) {
  return (
    <div className="bezel">
      <div className="bezel-core grid place-items-center px-6 py-20 text-center">
        <span className="relative grid size-20 place-items-center rounded-full border border-hair bg-white/[0.03] text-accent-bright">
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.22),transparent_70%)]" />
          <Icon size={28} />
        </span>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-soft">{message}</p>
        <span className="hairline-fade mt-6 block h-px w-24" />
      </div>
    </div>
  );
}

export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid place-items-center px-6 py-24" role="status">
      <span className="relative grid size-14 place-items-center rounded-full">
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.25),transparent_70%)]" />
        <Spinner size={30} className="animate-spin text-accent-bright" />
      </span>
      <span className="mt-5 text-[10px] font-medium uppercase tracking-[0.28em] text-muted">{label}</span>
    </div>
  );
}

export function DividerLine() {
  return <hr className="my-5 h-px border-0 bg-hair" />;
}

export function SectionLabel({
  title,
  eyebrow,
  trailing,
}: {
  title: string;
  /** Only rendered when it says something — a pill reading "Section" is noise. */
  eyebrow?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 pb-6 pt-16">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="font-display text-[1.6rem] font-semibold leading-none tracking-[-0.02em] text-ink sm:text-[2rem]">
          {title}
        </h2>
      </div>
      {trailing}
    </div>
  );
}

/* ══ SEARCH ═════════════════════════════════════════════════════════════════*/

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
    <div className="bezel bezel-sm group transition-colors duration-500 focus-within:border-accent/45">
      <div className="bezel-core relative flex items-center gap-3 px-4 py-3">
        <span className="shrink-0 text-muted transition-colors duration-500 group-focus-within:text-accent-bright">
          <Search size={17} />
        </span>
        <input
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={hint}
          aria-label={hint}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>
    </div>
  );
}

/* ══ BUTTONS ════════════════════════════════════════════════════════════════*/

/**
 * The primary CTA. A fully-rounded pill whose trailing icon is nested in its
 * own circle flush with the inner padding — never a naked arrow beside text.
 * On hover the nested circle drifts diagonally while the pill presses down,
 * which is where the kinetic tension comes from.
 */
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
  variant = 'solid',
}: {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: Icon;
  color?: string;
  type?: 'button' | 'submit';
  className?: string;
  full?: boolean;
  variant?: 'solid' | 'ghost';
}) {
  const isDisabled = disabled || loading;
  const tinted = color !== undefined;

  const surface: React.CSSProperties = tinted
    ? {
        background: `linear-gradient(150deg, color-mix(in srgb, ${color} 82%, white) 0%, ${color} 55%, color-mix(in srgb, ${color} 78%, black) 100%)`,
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.28), 0 16px 34px -16px color-mix(in srgb, ${color} 85%, transparent)`,
      }
    : {};

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full font-medium tracking-[-0.01em] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${
        full ? 'w-full px-7 py-4 text-[15px]' : 'px-5 py-2.5 text-[13px]'
      } ${
        variant === 'ghost'
          ? 'border border-hair-bright bg-white/[0.04] text-ink hover:border-hair-strong hover:bg-white/[0.08]'
          : tinted
            ? 'text-white'
            : 'plate-accent text-white'
      } ${className}`}
      style={variant === 'ghost' ? undefined : surface}
    >
      {variant !== 'ghost' && (
        <span className="sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      )}

      {loading ? (
        <Spinner size={full ? 19 : 16} className="relative animate-spin" />
      ) : (
        <>
          <span className="relative">{label}</span>
          {Icon && (
            <span
              className={`relative grid shrink-0 place-items-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[2px] group-hover:scale-105 ${
                full ? 'size-8' : 'size-6'
              } ${variant === 'ghost' ? 'bg-white/[0.08] group-hover:bg-white/[0.14]' : 'bg-white/20 group-hover:bg-white/30'}`}
            >
              <Icon size={full ? 15 : 13} />
            </span>
          )}
        </>
      )}
    </button>
  );
}

/** The muted companion every dialog pairs with its primary action. */
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
      className="rounded-full border border-hair-bright bg-white/[0.03] px-5 py-2.5 text-[13px] font-medium text-ink-soft transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-hair-strong hover:bg-white/[0.07] hover:text-ink active:scale-[0.97] disabled:opacity-40"
    >
      {label}
    </button>
  );
}

/** Row actions — circular, hairline, and they never shout until hovered. */
export function EditButton({ onClick, label = 'Edit' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-full border border-hair bg-white/[0.03] text-muted transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-accent/45 hover:bg-accent/15 hover:text-accent-bright active:scale-[0.92]"
    >
      <Pencil size={15} />
    </button>
  );
}

export function DeleteButton({ onClick, label = 'Delete' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 place-items-center rounded-full border border-hair bg-white/[0.03] text-muted transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-error/45 hover:bg-error/15 hover:text-error active:scale-[0.92]"
    >
      <Trash size={15} />
    </button>
  );
}

/** The floating create action. Expands to reveal its label on hover. */
export function FloatingAction({
  onClick,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  label: string;
  icon: Icon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group fixed bottom-7 right-7 z-40 flex items-center gap-0 overflow-hidden rounded-full plate-accent px-4 py-4 text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:gap-2.5 hover:pr-6 active:scale-[0.94]"
    >
      <Icon size={20} />
      <span className="max-w-0 whitespace-nowrap text-[13px] font-medium opacity-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:max-w-[12rem] group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

/* ══ DATA DISPLAY ═══════════════════════════════════════════════════════════*/

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
    <div className="flex items-baseline justify-between gap-6 border-b border-hair py-3 last:border-0">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">{label}</span>
      <span
        className="tnum min-w-0 break-words text-right text-[15px] font-medium tracking-[-0.01em]"
        style={{ color: valueColor ?? 'var(--color-ink)' }}
      >
        {value}
      </span>
    </div>
  );
}

/* ══ FORMS ══════════════════════════════════════════════════════════════════*/

export function FormSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bezel">
      <div className="bezel-core p-6 sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          {/* A lit tick rather than a label — it marks the section without
              adding a word that repeats the heading. */}
          <span className="h-5 w-px shrink-0 bg-gradient-to-b from-accent to-transparent" />
          <div>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h2 className="font-display text-[1.25rem] font-semibold leading-none tracking-[-0.015em] text-ink">
              {title}
            </h2>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

/** A field's inner plate — shared by inputs, textareas and selects. */
const FIELD_SHELL =
  'rounded-2xl border border-hair bg-black/40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:border-accent/50 focus-within:bg-black/60 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.1)]';
const FIELD_INPUT =
  'w-full bg-transparent px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-faint';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  number?: boolean;
  multiline?: number;
  required?: boolean;
  error?: string | null;
  icon?: Icon;
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
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-2 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
        {required && <span className="text-accent-bright"> *</span>}
      </label>

      <div
        className={FIELD_SHELL}
        style={error ? { borderColor: 'color-mix(in srgb, var(--color-error) 55%, transparent)' } : undefined}
      >
        <div className="flex items-center">
          {Icon && (
            <span className="pl-4 text-muted">
              <Icon size={17} />
            </span>
          )}
          {multiline ? (
            <textarea
              id={id}
              rows={multiline}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={hint}
              className={`${FIELD_INPUT} resize-y`}
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
              className={`${FIELD_INPUT} ${number ? 'tnum' : ''}`}
            />
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-[11px] font-medium text-error">{error}</p>}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
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
    <div className="mb-5">
      <label htmlFor={id} className="mb-2 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
        {required && <span className="text-accent-bright"> *</span>}
      </label>

      <div
        className={`relative ${FIELD_SHELL}`}
        style={error ? { borderColor: 'color-mix(in srgb, var(--color-error) 55%, transparent)' } : undefined}
      >
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${FIELD_INPUT} cursor-pointer appearance-none pr-11 [&>option]:bg-[#121216] [&>option]:text-ink`}
        >
          {options.map(o => (
            <option key={`${o.value}-${o.label}`} value={o.value}>
              {o.indent ? `⤷  ${o.label}` : o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
          <ChevronRight size={14} className="rotate-90" />
        </span>
      </div>

      {error && <p className="mt-2 text-[11px] font-medium text-error">{error}</p>}
    </div>
  );
}

/** A switch with a thumb that glides on the house spring. */
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
      className={`inline-flex items-center gap-3 rounded-full border px-4 py-2.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
        value
          ? 'border-accent/45 bg-accent/12 text-accent-soft'
          : 'border-hair bg-white/[0.03] text-muted hover:border-hair-bright'
      }`}
    >
      <span
        className={`relative block h-[18px] w-8 shrink-0 rounded-full transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          value ? 'bg-accent' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-[3px] block size-3 rounded-full bg-white shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            value ? 'translate-x-[17px]' : 'translate-x-[3px]'
          }`}
        />
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
    </button>
  );
}

/* ══ NOTES ══════════════════════════════════════════════════════════════════*/

export function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/[0.07] p-4">
      <span className="mt-px shrink-0 text-accent-bright">
        <Info size={17} />
      </span>
      <div className="flex-1 text-[13px] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export function HelpBox({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-2xl border border-hair bg-white/[0.02] p-4">
      {lines.map(line => (
        <div key={line} className="mb-2.5 flex items-start gap-3 last:mb-0">
          <span className="mt-1 size-1 shrink-0 rounded-full bg-accent" />
          <p className="flex-1 text-[12.5px] leading-relaxed text-muted">{line}</p>
        </div>
      ))}
    </div>
  );
}

/* ══ TABS & CHIPS ═══════════════════════════════════════════════════════════
   The active pill slides between positions rather than cutting, which is the
   difference between "tabs" and "one object that moves". */

export function PillTabs<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onSelect: (id: T) => void;
}) {
  const index = Math.max(0, tabs.findIndex(t => t.id === active));

  return (
    <div className="bezel bezel-sm inline-block w-full sm:w-auto">
      <div className="bezel-core relative flex p-1" role="tablist">
        <span
          aria-hidden
          className="absolute inset-y-1 rounded-full plate-accent transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            width: `calc((100% - 0.5rem) / ${tabs.length})`,
            transform: `translateX(calc(${index} * 100%))`,
            left: '0.25rem',
          }}
        />
        {tabs.map(t => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(t.id)}
              className={`relative flex-1 whitespace-nowrap rounded-full px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-500 ${
                selected ? 'text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const selected = o.value === active;
        return (
          <button
            key={o.value || 'all'}
            type="button"
            onClick={() => onSelect(o.value)}
            aria-pressed={selected}
            className={`rounded-full border px-5 py-2 text-[12.5px] font-medium tracking-[-0.01em] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.96] ${
              selected
                ? 'border-transparent plate-accent text-white'
                : 'border-hair bg-white/[0.03] text-muted hover:border-hair-strong hover:bg-white/[0.07] hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ══ UPLOAD ═════════════════════════════════════════════════════════════════*/

export function ImageSpecsBox({ specs }: { specs: ImageSpecs }) {
  const rows: [Icon, string][] = [
    [Ratio, `Recommended ${specs.recWidth} × ${specs.recHeight} px (${specs.ratioLabel})`],
    [Scan, `Minimum ${IMAGE_MIN_WIDTH} × ${IMAGE_MIN_HEIGHT} px`],
    [HardDrive, 'Max file size 5 MB'],
    [ImageIcon, 'JPG, PNG or WebP'],
  ];
  return (
    <div className="rounded-2xl border border-hair bg-white/[0.02] p-5">
      <Eyebrow>Requirements</Eyebrow>
      <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
        {rows.map(([Icon, text]) => (
          <div key={text} className="flex items-center gap-2.5">
            <span className="shrink-0 text-accent-bright/70">
              <Icon size={15} />
            </span>
            <p className="text-[12.5px] text-muted">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SpecRow({ icon: Icon, text }: { icon: Icon; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 text-accent-bright/70">
        <Icon size={15} />
      </span>
      <p className="text-[12.5px] text-muted">{text}</p>
    </div>
  );
}

/** A dashed drop-zone that also opens the file picker. */
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
        className={`group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-9 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 ${
          dragging
            ? 'border-accent bg-accent/12'
            : 'border-hair-bright bg-white/[0.02] hover:border-accent/45 hover:bg-accent/[0.06]'
        }`}
      >
        <span className="grid size-11 place-items-center rounded-full border border-hair bg-white/[0.04] text-accent-bright transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5">
          {uploading ? <Spinner size={19} className="animate-spin" /> : <Upload size={19} />}
        </span>
        <span className="text-[13px] font-medium text-ink-soft">
          {uploading ? 'Uploading…' : label}
        </span>
        {!uploading && <span className="text-[11px] text-faint">or drop a file here</span>}
      </button>
    </>
  );
}

/* ══ MODAL ══════════════════════════════════════════════════════════════════
   A screen-filling glass overlay. The panel scales up from 96% as it arrives,
   which reads as the dialog coming toward you rather than blinking in. */

export function Modal({
  title,
  icon: Icon,
  accent = 'var(--color-accent)',
  onClose,
  children,
  actions,
  wide = false,
}: {
  title: string;
  icon?: Icon;
  accent?: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
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
      className={`fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10 backdrop-blur-2xl transition-opacity duration-500 ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bezel w-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          wide ? 'max-w-2xl' : 'max-w-md'
        } ${entered ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-[0.96] opacity-0'}`}
      >
        <div className="bezel-core overflow-hidden">
          <div className="flex items-center gap-3 border-b border-hair px-6 py-5">
            {Icon && (
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full border"
                style={{
                  color: accent,
                  borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                }}
              >
                <Icon size={17} />
              </span>
            )}
            <h2 className="flex-1 font-display text-[1.15rem] font-semibold tracking-[-0.02em] text-ink">
              {title}
            </h2>
            <IconButton label="Close" onClick={onClose}>
              <Close size={16} />
            </IconButton>
          </div>

          <div className="px-6 py-6">{children}</div>

          {actions && (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-hair px-6 py-5">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ OTP ════════════════════════════════════════════════════════════════════*/

export function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className={FIELD_SHELL}>
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        aria-label="OTP"
        placeholder="––––––"
        className="tnum w-full bg-transparent px-4 py-4 text-center font-mono text-2xl font-medium tracking-[0.5em] text-ink outline-none placeholder:text-faint"
      />
    </div>
  );
}

/** The OTP readout the dispatch and approve dialogs relay to the customer. */
export function OtpDisplay({ otp }: { otp: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-accent/[0.08] py-6 text-center">
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.22),transparent_70%)]" />
      <span className="tnum relative font-mono text-[2.5rem] font-medium tracking-[0.35em] text-accent-soft [text-shadow:0_0_24px_rgba(167,139,250,0.55)]">
        {otp || '––––––'}
      </span>
    </div>
  );
}

/* ══ IMAGE ══════════════════════════════════════════════════════════════════*/

/** Falls back to a placeholder rather than a broken-image glyph, and fades in. */
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span className={`grid place-items-center bg-white/[0.03] text-faint ${className}`}>
        {fallback ?? <ImageIcon size={20} />}
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
      className={`transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}

/** Re-exported so pages can render an indent glyph without reaching for icons. */
export { Indent, Check };
