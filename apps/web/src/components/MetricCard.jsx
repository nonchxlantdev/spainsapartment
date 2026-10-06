// apps/web/src/components/MetricCard.jsx
import { cardClass } from '../ui.js';

export default function MetricCard({ label, value, sub, Icon, tone, emphasize }) {
  const emphasizeClass =
    emphasize && tone === 'accent'
      ? 'bg-accent/5 border-l-4 border-l-accent'
      : emphasize && tone === 'warn'
        ? 'bg-warning/5 border-l-4 border-l-warning'
        : emphasize && tone === 'gold'
          ? 'bg-gold/5 border-l-4 border-l-gold'
          : '';

  const valueClass =
    tone === 'accent'
      ? 'text-primary'
      : tone === 'warn'
        ? 'text-warning'
        : tone === 'gold'
          ? 'text-gold'
          : '';

  return (
    <div className={`${cardClass} p-5 ${emphasizeClass}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-mutedfg uppercase tracking-wide">
        {Icon && <Icon className="w-3.5 h-3.5 text-mutedfg shrink-0" aria-hidden="true" />}
        {label}
      </div>
      <div className={`text-2xl lg:text-[1.75rem] font-bold font-mono mt-2 ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-mutedfg mt-1.5">{sub}</div>}
    </div>
  );
}
