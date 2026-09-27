/**
 * Scroll-entry choreography.
 *
 * Elements arrive with mass — they rise, sharpen out of a blur and settle.
 * The animation itself lives in `.reveal` in index.css (transform / opacity /
 * filter only, so it stays on the GPU); this just decides when to flip the
 * `data-shown` flag.
 *
 * Driven by IntersectionObserver, never a scroll listener: a scroll handler
 * fires continuously and forces reflow on every frame, which is exactly how an
 * admin console with long lists ends up janky on a phone.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

let sharedObserver: IntersectionObserver | null = null;
const watched = new WeakMap<Element, () => void>();

/**
 * One observer for the whole page rather than one per element — a list of 60
 * orders would otherwise spin up 60 observers.
 */
function observer(): IntersectionObserver {
  sharedObserver ??= new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        watched.get(entry.target)?.();
        sharedObserver?.unobserve(entry.target);
        watched.delete(entry.target);
      }
    },
    // Start the reveal slightly before the element reaches the fold, so it has
    // finished settling by the time it is properly in view.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  return sharedObserver;
}

interface RevealProps {
  children: ReactNode;
  /** Milliseconds to hold before this element starts — used to stagger a row. */
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'header';
}

export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect the OS setting: show it immediately, animate nothing.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }

    // An element already on screen at mount (above the fold) should still play
    // its entry, so it is observed the same way rather than special-cased.
    watched.set(node, () => setShown(true));
    observer().observe(node);

    return () => {
      observer().unobserve(node);
      watched.delete(node);
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-shown={shown ? 'true' : 'false'}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${className}`}
    >
      {children}
    </Tag>
  );
}

/**
 * Staggers a set of siblings by a fixed step. Capped, because a 60-row list
 * with a 60ms step would leave the last row waiting nearly four seconds.
 */
export function stagger(index: number, step = 60, max = 420): number {
  return Math.min(index * step, max);
}
