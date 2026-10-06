// apps/web/tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#F59E0B',
        secondary: '#22D3EE',
        accent: '#F59E0B',
        gold: '#F59E0B',
        goldlight: '#FBBF24',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        mutedfg: 'rgb(var(--color-mutedfg) / <alpha-value>)',
        border: 'rgba(245,158,11,0.28)',
        warning: '#B45309',
        warningbg: 'rgba(180,83,9,0.18)',
        success: '#15803D',
        successbg: 'rgba(21,128,61,0.18)',
        destructive: '#DC2626',
        hud: {
          bg: 'rgb(var(--color-background) / <alpha-value>)',
          panel: 'rgb(var(--color-panel) / <alpha-value>)',
          panelAlt: 'rgb(var(--color-panel-alt) / <alpha-value>)',
          amber: '#F59E0B',
          cyan: '#22D3EE',
          text: 'rgb(var(--color-foreground) / <alpha-value>)',
          muted: 'rgb(var(--color-mutedfg) / <alpha-value>)'
        }
      },
      maxWidth: {
        app: '1440px'
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'ui-sans-serif', 'system-ui'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        card: '0 0 24px -8px rgba(245,158,11,0.35)',
        'card-hover': '0 0 28px -6px rgba(245,158,11,0.45)',
        btn: '0 0 18px -4px rgba(245,158,11,0.55)',
        'hud-amber': '0 0 24px -8px rgba(245,158,11,0.45)',
        'hud-cyan': '0 0 24px -8px rgba(34,211,238,0.4)',
        'hud-nav': '0 0 16px rgba(245,158,11,0.5)'
      }
    }
  },
  plugins: []
};
