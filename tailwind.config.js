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
        // ─── Paleta Huemint Bootstrap-Plus ─────────────────────────────────────
        // #ade2e6 · #ffffff · #000100 · #322920 · #566262 · #66767f · #364486 · #7286b6 · #9cb3ba
        huemint: {
          aqua: '#ade2e6',       // Aqua / Cyan luminoso para acentos y verificación
          white: '#ffffff',      // Blanco de alto contraste
          black: '#000100',      // Negro profundo obsidiana base
          espresso: '#322920',   // Carbón oscuro cálido
          slateGreen: '#566262', // Gris verdoso sobrio
          steel: '#66767f',      // Gris acero para bordes y texto secundario
          navy: '#364486',       // Azul marino / royal profundo para botones y marca
          periwinkle: '#7286b6', // Azul bígaro para hovers y estados activos
          ice: '#9cb3ba',        // Hielo grisáceo para textos secundarios y chips
        },

        // Mapeo semántico para componentes
        primary: {
          DEFAULT: '#364486',
          hover: '#7286b6',
          active: '#263063',
          light: '#7286b6',
          glow: 'rgba(54, 68, 134, 0.45)',
        },

        accent: {
          DEFAULT: '#ade2e6',
          light: '#ffffff',
          dark: '#7286b6',
          glow: 'rgba(173, 226, 230, 0.35)',
        },

        surface: {
          dark: '#000100',
          panel: '#0e131d',
          card: '#141a26',
          hover: '#1b2333',
          border: '#66767f',
          borderSubtle: '#566262',
        },

        content: {
          main: '#ffffff',
          sub: '#9cb3ba',
          muted: '#66767f',
          inverse: '#000100',
        },

        // Estados de validación usando el tono Aqua (#ade2e6)
        validated: {
          DEFAULT: '#ade2e6',
          badge: 'rgba(173, 226, 230, 0.12)',
          border: 'rgba(173, 226, 230, 0.45)',
          text: '#ade2e6',
          glow: 'rgba(173, 226, 230, 0.3)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'huemint-primary': '0 4px 20px -2px rgba(54, 68, 134, 0.5)',
        'huemint-aqua': '0 0 25px -3px rgba(173, 226, 230, 0.35)',
        'huemint-card': '0 20px 40px -15px rgba(0, 1, 0, 0.8)',
      },
      borderRadius: {
        'corporate': '0.6rem',
        'corporate-lg': '0.9rem',
      },
    },
  },
  plugins: [],
};
