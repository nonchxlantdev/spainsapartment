// apps/web/src/components/Avatar.jsx
import { initials } from '../icons.jsx';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-base'
};

export default function Avatar({ name, size = 'sm' }) {
  return (
    <div
      className={`${SIZES[size]} rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold shrink-0 ring-2 ring-white shadow-sm`}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
