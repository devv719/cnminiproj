/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#F5F3EE',
          surface: '#FFFFFF',
          cream: '#ECE9E2',
          subtle: '#F0EDE6',
        },
        border: {
          main: '#DCD9D1',
          dark: '#141413',
          subtle: '#E8E5DC',
        },
        ink: {
          DEFAULT: '#141413',
          muted: '#626059',
          subtle: '#969389',
          faint: '#C2BEB4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        editorial: ['Manrope', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
      }
    },
  },
  plugins: [],
}
