import { cardClass, hudPanelAmber, hudPanelCyan } from '../ui.js';

/** Shared HUD panel shell — amber (default) or cyan accent. */
export default function HudPanel({ accent = 'amber', className = '', children }) {
  const base = accent === 'cyan' ? hudPanelCyan : accent === 'plain' ? cardClass : hudPanelAmber;
  return <div className={`${base} ${className}`.trim()}>{children}</div>;
}
