const STYLES = {
  paid: 'bg-successbg text-[#4ADE80] ring-1 ring-inset ring-success/30',
  partial: 'bg-warningbg text-[#FBBF24] ring-1 ring-inset ring-warning/30',
  pending: 'bg-blue-500/15 text-[#60A5FA] ring-1 ring-inset ring-blue-400/30',
  free: 'bg-teal-500/15 text-[#2DD4BF] ring-1 ring-inset ring-teal-400/30',
  former: 'bg-slate-500/20 text-slate-300 ring-1 ring-inset ring-slate-400/30'
};
const LABELS = { paid: 'Paid', partial: 'Partial', pending: 'Pending', free: 'No rent', former: 'Former' };

export default function StatusPill({ status, active = 1 }) {
  const key = active === 0 || active === false ? 'former' : status;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-0.5 rounded-full ${STYLES[key] || STYLES.pending}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LABELS[key] || status}
    </span>
  );
}
