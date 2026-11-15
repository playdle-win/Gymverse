// Small shared helpers for the UI system.
import { useEffect, useRef, useState } from 'preact/hooks';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const groupDigits = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
/** 12480 -> "12,480" */
export const formatInt = (n) => groupDigits.format(Math.round(n));

/** Subscribes a component to a media query. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where sheets, dialogs and toasts render: the layer inside the phone stage (never the browser viewport). */
export const overlayHost = () => document.getElementById('gb-overlays') || document.body;

/** The stage is scaled down on short desktop windows; pointer deltas must be divided by this. */
export function stageScale() {
  const stage = document.getElementById('gb-stage');
  if (!stage) return 1;
  const scale = stage.getBoundingClientRect().width / stage.offsetWidth;
  return scale > 0 ? scale : 1;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside `ref` while `active`, closes on Escape, and returns focus to where it was. */
export function useFocusTrap(ref, active, onEscape) {
  const escape = useRef(onEscape);
  escape.current = onEscape;
  useEffect(() => {
    if (!active || !ref.current) return undefined;
    const node = ref.current;
    const previous = document.activeElement;
    const focusables = () => [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    (node.querySelector('[data-autofocus]') || node).focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (escape.current) escape.current(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      if (previous && previous.focus && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [active]);
}

/** Mount/unmount with an exit transition: returns [mounted, shown]. `shown` flips one frame after mount. */
export function usePresence(open, exitMs = 420) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs);
    return () => clearTimeout(timer);
  }, [open]);
  return [mounted, shown];
}
