const STYLES = {
  paid: 'bg-successbg text-success ring-1 ring-inset ring-success/30',
  partial: 'bg-hud-cyan/15 text-hud-cyan ring-1 ring-inset ring-hud-cyan/30',
  due: 'bg-warningbg text-warning ring-1 ring-inset ring-warning/30',
  overdue: 'bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/30'
};
const LABELS = { paid: 'Paid', partial: 'Partial', due: 'Due', overdue: 'Overdue' };

/** Status pill for a logged bill — paid/partial/due/overdue, computed server-side. */
export default function BillStatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${STYLES[status] || STYLES.due}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LABELS[status] || status}
    </span>
  );
}
