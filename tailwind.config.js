/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#2563eb',
        'brand-primary-dark': '#1e40af',
        'brand-primary-light': '#3b82f6',
      },
    },
  },
  plugins: [],
}
