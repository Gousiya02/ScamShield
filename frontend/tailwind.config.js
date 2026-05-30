/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#000000',
          card: 'rgba(8, 8, 8, 0.8)',
          accent: '#00ff66',
          glow: 'rgba(0, 255, 102, 0.15)',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          textMuted: '#9ca3af'
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.8', boxShadow: '0 0 15px rgba(0, 255, 102, 0.4)' },
          '50%': { opacity: '1', boxShadow: '0 0 25px rgba(0, 255, 102, 0.8)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' }
        }
      }
    },
  },
  plugins: [],
}
