// apps/web/src/components/AnimatedNumber.jsx
import { useCountUp } from '../hooks.js';

/**
 * Renders a number that counts up (or down) to `value` whenever it changes,
 * instead of just popping to the new figure. `format` receives the rounded,
 * already-animating number — pass the app's `money()` helper for currency.
 */
export default function AnimatedNumber({ value, duration = 900, format }) {
  const animated = useCountUp(value, duration);
  const rounded = Math.round(animated);
  return format ? format(rounded) : rounded.toLocaleString();
}
