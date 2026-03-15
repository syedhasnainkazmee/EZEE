/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'sans-serif'],
        display: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        p: {
          bg:              '#F4F2EE',
          surface:         '#FDFCFB',
          nav:             '#100F0D',
          border:          '#E5E0D8',
          'border-strong': '#CCC7BF',
          text:            '#18160F',
          secondary:       '#5C5750',
          tertiary:        '#7D7770',
          quaternary:      '#A8A09A',
          fill:            '#EDEBE6',
          accent:          '#D4512E',
          'accent-h':      '#BA3E1E',
          'accent-soft':   'rgba(212, 81, 46, 0.08)',
          success:         '#0EA572',
          warning:         '#E8882C',
          error:           '#DC3545',
          dark:            '#100F0D',
          'dark-s':        '#1C1916',
          'dark-s2':       '#2E2A26',
        },
        // Keep sh-* for AnnotationCanvas backward compat
        sh: {
          navy:    '#100F0D',
          navy80:  '#1C1916',
          navy60:  '#2E2A26',
          orange:  '#D4512E',
          orangeh: '#BA3E1E',
          bg:      '#F4F2EE',
          border:  '#E5E0D8',
          muted:   '#7D7770',
        },
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(24,22,15,0.05), 0 4px 12px -2px rgba(24,22,15,0.04)',
        'card-h':  '0 8px 28px -4px rgba(24,22,15,0.10), 0 2px 8px -2px rgba(24,22,15,0.06)',
        'popup':   '0 16px 40px -8px rgba(24,22,15,0.16), 0 4px 12px -4px rgba(24,22,15,0.10)',
        'modal':   '0 32px 64px -12px rgba(24,22,15,0.22)',
        'accent':  '0 6px 20px -4px rgba(212, 81, 46, 0.32)',
        'glow':    '0 0 0 3px rgba(212, 81, 46, 0.15)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.45' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'notif-slide': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in':       'fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slide-in-left 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in':      'scale-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-soft':    'pulse-soft 2.5s ease-in-out infinite',
        'shimmer':       'shimmer 2.2s linear infinite',
        'notif-slide':   'notif-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
