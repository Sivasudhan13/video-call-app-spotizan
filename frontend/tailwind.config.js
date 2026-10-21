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
          lavender: '#B9A7F5',
          lightLavender: '#F1EDFF',
          deepLavender: '#7960D8',
          white: '#FFFFFF',
          tomato: '#FF6347',
          softTomato: '#FFF0EC',
          dark: '#27243A',
          muted: '#777387',
          border: '#E8E4F0',
          success: '#218A58',
          error: '#D92D20',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(121, 96, 216, 0.08)',
        'card': '0 2px 12px -1px rgba(39, 36, 58, 0.06)',
        'tomato': '0 4px 16px -2px rgba(255, 99, 71, 0.35)',
        'lavender': '0 4px 16px -2px rgba(121, 96, 216, 0.25)',
      },
    },
  },
  plugins: [],
};
