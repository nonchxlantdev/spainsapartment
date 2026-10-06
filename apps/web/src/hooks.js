// apps/web/src/hooks.js — small animation utilities shared across the HUD UI.
import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Animates a number from its previous value up (or down) to `target` using
 * requestAnimationFrame with a cubic ease-out. Returns the current animated
 * value on every render; round it before formatting.
 */
export function useCountUp(target, duration = 900) {
  const numericTarget = Number(target) || 0;
  const [value, setValue] = useState(prefersReducedMotion() ? numericTarget : 0);
  const fromRef = useRef(prefersReducedMotion() ? numericTarget : 0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(numericTarget);
      fromRef.current = numericTarget;
      return;
    }
    const from = fromRef.current;
    const delta = numericTarget - from;
    if (delta === 0) return undefined;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = numericTarget;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericTarget, duration]);

  return value;
}

/**
 * Returns 0 on the mounting render, then `target` a tick later — so a CSS
 * `transition` on width / stroke-dasharray / stroke-dashoffset actually
 * animates in on first paint instead of snapping straight to its resting
 * value. Skips the delay entirely when the viewer prefers reduced motion.
 */
export function useMountedPct(target, delay = 60) {
  const numericTarget = Number(target) || 0;
  const [pct, setPct] = useState(prefersReducedMotion() ? numericTarget : 0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setPct(numericTarget);
      return undefined;
    }
    const id = setTimeout(() => setPct(numericTarget), delay);
    return () => clearTimeout(id);
  }, [numericTarget, delay]);

  return pct;
}

const THEME_STORAGE_KEY = 'sa-theme';

/**
 * Light/dark theme toggle. Persists the choice to localStorage and reflects
 * it as `data-theme` on <html>, which index.css keys its CSS variables off
 * of. Defaults to the dark HUD look when nothing is stored yet.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable (private browsing, etc.) — theme still works for this session.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }

  return [theme, toggleTheme];
}

/**
 * A single-slot toast queue: `fire(message)` shows it, auto-dismissing after
 * `duration` ms. Used for the "coming soon" feedback on unbuilt controls so
 * they acknowledge the click instead of doing nothing.
 */
export function useToast(duration = 2300) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const idRef = useRef(0);

  function fire(message) {
    idRef.current += 1;
    setToast({ message, id: idRef.current });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), duration);
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return [toast, fire];
}
