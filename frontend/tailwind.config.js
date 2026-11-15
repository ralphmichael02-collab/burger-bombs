/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html', 
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary:         'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        background:      'var(--color-background)',
        surface:         'var(--color-surface)',
        text:            'var(--color-text)',
        'text-muted':    'var(--color-text-muted)',
        border:          'var(--color-border)',
        success:         'var(--color-success)',
        danger:          'var(--color-danger)',
      },
      fontFamily: {
        sans: ['"Source Sans Pro"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};