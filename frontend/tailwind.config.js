/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF5E14',
          hover: '#E04D0B',
        },
        'accent-dark': '#121212',
        canvas: '#FF6827',
        card: {
          DEFAULT: '#FFFFFF',
          subtle: '#F8F9FA',
        },
        text: {
          main: '#18181B',
          muted: '#71717A',
        },
        border: '#E4E4E7',
      },
      backgroundImage: {
        'gradient-hero':
          'linear-gradient(135deg, rgba(28, 10, 48, 0.65) 0%, rgba(139, 44, 255, 0.4) 50%, rgba(255, 94, 20, 0.3) 100%)',
      },
      fontFamily: {
        display: ['"Oswald"', '"Bebas Neue"', 'sans-serif'],
      },
      borderRadius: {
        card: '32px',
        'card-lg': '44px',
      },
    },
  },
  plugins: [],
}
