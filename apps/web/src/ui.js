// apps/web/src/ui.js: shared presentation class strings
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const btnPrimary =
  `inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] bg-amber-500 text-[#0B1220] rounded-md font-semibold shadow-btn hover:brightness-110 active:scale-[0.98] transition-all duration-150 ${focusRing}`;

export const btnSecondary =
  `inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold border border-amber-500/40 rounded-md bg-surface text-foreground hover:bg-muted active:scale-[0.98] transition-all duration-150 ${focusRing}`;

export const inputClass =
  `w-full border border-cyan-400/30 rounded-md bg-muted text-foreground px-2.5 py-2 text-[13px] ${focusRing}`;

export const cardClass = 'hud-panel overflow-hidden';

export const cardInteractive =
  'hud-panel overflow-hidden hover:shadow-card-hover transition-shadow duration-200';

export const hudPanelAmber = 'hud-panel overflow-hidden';
export const hudPanelCyan = 'hud-panel-cyan overflow-hidden';
