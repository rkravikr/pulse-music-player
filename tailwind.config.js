/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0f0f11', // Very dark charcoal
          surface: '#18181c',    // Slightly lighter surface dark
          elevated: '#22222a',   // Elevated surface dark
        },
        accent: {
          light: 'hsl(calc(var(--accent-h) - 10) var(--accent-s) calc(var(--accent-l) + 10%))',
          DEFAULT: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
          dark: 'hsl(calc(var(--accent-h) + 5) var(--accent-s) calc(var(--accent-l) - 12%))',
        },
        text: {
          primary: '#ffffff',
          secondary: '#94a3b8',  // Slate gray
          muted: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
