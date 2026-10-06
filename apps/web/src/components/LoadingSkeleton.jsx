// apps/web/src/components/LoadingSkeleton.jsx
import { cardClass } from '../ui.js';

export default function LoadingSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${cardClass} p-5 animate-pulse`} aria-hidden="true">
          <div className="h-3 w-24 bg-muted rounded mb-3" />
          <div className="h-8 w-32 bg-muted rounded mb-2" />
          <div className="h-2.5 w-20 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
