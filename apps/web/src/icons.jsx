// apps/web/src/icons.jsx: inline SVGs copied from design-reference/mockup.html

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'aria-hidden': 'true'
};

export function IconDashboard({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconTenants({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.6 2.9-6 5.5-6s5.5 2.4 5.5 6" />
      <path d="M16 4.2c1.5.4 2.6 1.8 2.6 3.4 0 1.6-1.1 3-2.6 3.4M18.5 14.3c2 .5 3.5 2.4 3.5 4.7" />
    </svg>
  );
}

export function IconBuilding({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 8h.01M15 8h.01M9 13h.01M15 13h.01M9 18h.01M15 18h.01" />
    </svg>
  );
}

export function IconReceipt({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export function IconSearch({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconCheck({ className }) {
  return (
    <svg {...base} strokeWidth="2.2" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconEye({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c5 0 9 4 10 7-.4 1.1-1.2 2.4-2.3 3.6M6.6 6.6C4.5 8 3 10 2 12c1 3 5 7 10 7 1.3 0 2.6-.3 3.7-.7" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function IconChevronLeft({ className }) {
  return (
    <svg {...base} strokeWidth="2.4" className={className}>
      <path d="M14.5 5 8 12l6.5 7" />
    </svg>
  );
}

export function IconChevronRight({ className }) {
  return (
    <svg {...base} strokeWidth="2.4" className={className}>
      <path d="M9.5 5 16 12l-6.5 7" />
    </svg>
  );
}

export function IconWhatsApp({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-5.3A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8.5 9.5c0 3.5 2.5 6 6 6" />
    </svg>
  );
}

export function IconArrowRight({ className }) {
  return (
    <svg {...base} strokeWidth="2.4" className={className}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconDollar({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M12 3v18" />
      <path d="M17 8.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 3 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3" />
    </svg>
  );
}

export function IconAlert({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="m12 3 9.5 16.5H2.5L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconPhone({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M7.5 3.5h3l1.5 4-2 1.2a12 12 0 0 0 5.3 5.3l1.2-2 4 1.5v3A2 2 0 0 1 18.5 18 14.5 14.5 0 0 1 4 3.5a2 2 0 0 1 3.5 0Z" />
    </svg>
  );
}

export function IconMail({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m3.5 7.5 8.5 6 8.5-6" />
    </svg>
  );
}

export function IconCalendar({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </svg>
  );
}

export function IconShield({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M12 3 5 6.5v5.2c0 4.1 2.8 7.4 7 8.8 4.2-1.4 7-4.7 7-8.8V6.5L12 3Z" />
      <path d="M12 11v4M12 8.5h.01" />
    </svg>
  );
}

export function IconCard({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 14h3" />
    </svg>
  );
}

export function IconNote({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M7 4h8l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M15 4v4h4M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconDoor({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M6 3h12v18H6z" />
      <path d="M10 3v18M13 12h.01" />
    </svg>
  );
}

export function IconBarChart({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M4 20h16" />
      <rect x="6" y="11" width="2.5" height="7" rx="0.8" />
      <rect x="11" y="8" width="2.5" height="10" rx="0.8" />
      <rect x="16" y="5" width="2.5" height="13" rx="0.8" />
    </svg>
  );
}

export function IconEnvelope({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="m4.5 7.5 7.5 6 7.5-6" />
    </svg>
  );
}

export function IconGear({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a7 7 0 0 0-1.8-1L14.2 3h-4.4l-.4 2a7 7 0 0 0-1.8 1l-2.5-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .3 0 .7.1 1l-2 1.6 2 3.4 2.5-1a7 7 0 0 0 1.8 1l.4 2h4.4l.4-2a7 7 0 0 0 1.8-1l2.5 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z" />
    </svg>
  );
}

export function IconFilter({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" />
    </svg>
  );
}

export function IconPlus({ className }) {
  return (
    <svg {...base} strokeWidth="2.4" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconDots({ className }) {
  return (
    <svg {...base} strokeWidth="2.4" className={className}>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </svg>
  );
}

export function IconChat({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M4 6h16v10H8l-4 4V6Z" />
    </svg>
  );
}

export function IconPlane({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M3 11.5 21 4l-7 16-2.5-6.5L3 11.5Z" />
    </svg>
  );
}

export function IconClock({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconWallet({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M16 12h4M6 10h5" />
    </svg>
  );
}

export function IconChevronDown({ className }) {
  return (
    <svg {...base} strokeWidth="2.4" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconBell({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M6 9a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconSun({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
    </svg>
  );
}

export function IconMoon({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M20.5 14.8A8.5 8.5 0 1 1 9.2 3.5a7 7 0 0 0 11.3 11.3Z" />
    </svg>
  );
}

export function IconLogout({ className }) {
  return (
    <svg {...base} strokeWidth="2" className={className}>
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
    </svg>
  );
}

export function initials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
