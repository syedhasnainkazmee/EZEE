/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        display: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        p: {
          bg:          '#FBFBF9', // Alabaster background
          surface:     '#FFFFFF',
          nav:         '#1C1917', // Elegant very dark stone
          border:      '#EAE5EO',
          'border-strong': '#D6D3D1',
          text:        '#1C1917', // High-contrast dark stone
          secondary:   '#57534E',
          tertiary:    '#78716C',
          quaternary:  '#A8A29E',
          fill:        '#F5F5F4',
          accent:       '#E05236', // Terracotta
          'accent-h':   '#BF4027', // Darker Terracotta
          'accent-soft': 'rgba(224, 82, 54, 0.08)',
          success:     '#10B981', // Emerald
          warning:     '#F59E0B', // Amber
          error:       '#EF4444', // Red
          dark:        '#1C1917',
          'dark-s':    '#292524',
          'dark-s2':   '#44403C',
        },
        // Keep sh-* for AnnotationCanvas backward compat
        sh: {
          navy:    '#1C1917',
          navy80:  '#292524',
          navy60:  '#44403C',
          orange:  '#E05236',
          orangeh: '#BF4027',
          bg:      '#FBFBF9',
          border:  '#EAE5EO',
          muted:   '#78716C',
        },
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px', // softer outer radii
      },
      boxShadow: {
        'card':   '0 2px 8px -2px rgba(28, 25, 23, 0.04), 0 1px 4px -1px rgba(28, 25, 23, 0.02)',
        'card-h': '0 12px 24px -6px rgba(28, 25, 23, 0.08), 0 4px 12px -3px rgba(28, 25, 23, 0.04)',
        'popup':  '0 20px 40px -8px rgba(28, 25, 23, 0.12), 0 8px 16px -4px rgba(28, 25, 23, 0.08)',
        'modal':  '0 32px 64px -12px rgba(28, 25, 23, 0.16)',
        'accent': '0 8px 16px -4px rgba(224, 82, 54, 0.25)', // Glow for primary buttons
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
