/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: 'var(--tg-theme-bg-color, #ffffff)',
          text: 'var(--tg-theme-text-color, #1f2937)',
          hint: 'var(--tg-theme-hint-color, #6b7280)',
          link: 'var(--tg-theme-link-color, #52c86b)',
          button: 'var(--tg-theme-button-color, #52c86b)',
          'button-text': 'var(--tg-theme-button-text-color, #ffffff)',
          'secondary-bg': 'var(--tg-theme-secondary-bg-color, #f3f4f6)',
          'header-bg': 'var(--tg-theme-header-bg-color, #ffffff)',
          'section-bg': 'var(--tg-theme-section-bg-color, #ffffff)',
          'accent': 'var(--tg-theme-accent-text-color, #fde047)',
          'destructive': 'var(--tg-theme-destructive-text-color, #ef4444)',
        },
        primary: {
          DEFAULT: '#52c86b',
          hover: '#a1e45c',
        },
        secondary: {
          DEFAULT: '#a1e45c',
        },
        accent: {
          DEFAULT: '#fde047',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
