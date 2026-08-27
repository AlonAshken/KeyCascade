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
        background: '#090a0f',
        panel: '#12141c',
        panelBorder: '#232738',
        accent: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          pink: '#f857a6',
          purple: '#b153ff',
          green: '#00f5a0',
          yellow: '#f9d423'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
