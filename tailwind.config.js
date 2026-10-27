/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Steep Design System (DESIGN.md) ──────────────────────────────────
        ink: {
          DEFAULT: '#17191c',
          black: '#17191c',
        },
        paper: {
          DEFAULT: '#ffffff',
          white: '#ffffff',
        },
        mist: {
          DEFAULT: '#f2f2f3',
          gray: '#f2f2f3',
        },
        fog: {
          DEFAULT: '#fafafb',
          white: '#fafafb',
        },
        slate: {
          gray: '#777b86',
        },
        ash: {
          gray: '#979799',
        },
        smoke: {
          gray: '#a3a6af',
        },
        blush: {
          DEFAULT: '#fbe1d1',
          peach: '#fbe1d1',
        },
        sienna: {
          DEFAULT: '#5d2a1a',
          brown: '#5d2a1a',
        },

        // Mapeo semántico
        primary: {
          DEFAULT: '#17191c',
          hover: '#2d3036',
          text: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f2f2f3',
          hover: '#e5e5e7',
          text: '#17191c',
        },
        accent: {
          DEFAULT: '#fbe1d1',
          text: '#5d2a1a',
        },
        surface: {
          canvas: '#ffffff',
          mist: '#f2f2f3',
          fog: '#fafafb',
          peach: '#fbe1d1',
        },
        border: {
          subtle: '#ececec',
          hairline: 'rgba(4, 23, 43, 0.06)',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Signifier', 'Source Serif 4', 'Georgia', 'serif'],
        sans: ['Inter', 'Sohne', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'cards': '24px',
        'elevated': '20px',
        'inputs': '16px',
        'pill': '9999px',
      },
      boxShadow: {
        'subtle': '0 0 0 1px rgba(4, 23, 43, 0.05), 0 4px 24px 0 rgba(0, 0, 0, 0.04)',
        'artifact': '0 0 0 1px rgba(4, 23, 43, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.07), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
