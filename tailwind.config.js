/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'yt-black': '#0f0f0f',
        'yt-dark-gray': '#282828',
        'yt-light-gray': '#303030',
        'yt-text-primary': '#ffffff',
        'yt-text-secondary': '#aaaaaa',
      }
    }
  },
  plugins: [],
}
