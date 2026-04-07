/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          DEFAULT: '#059669',
          dark: '#047857',
        },
        accent: {
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1e293b',
          text: '#475569',
        }
      }
    },
  },
  plugins: [],
}

