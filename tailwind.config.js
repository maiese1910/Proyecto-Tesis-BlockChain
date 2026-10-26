import colors from 'tailwindcss/colors';

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
        // ─── BASE CORPORATIVA SOBRIA (Slate) ──────────────────────────────────
        // Usado para fondos, superficies, bordes estructurados y tipografía
        corporate: colors.slate,
        slate: colors.slate,

        // Tokens semánticos de superficie y estructura (Slate)
        surface: {
          light: colors.slate[50],     // Fondos claros / páginas
          panel: colors.slate[100],    // Tarjetas e interfaces modales (modo claro)
          border: colors.slate[200],   // Bordes divisorios estándar
          subtle: colors.slate[300],   // Bordes de inputs / divisores marcados
          dark: colors.slate[900],     // Paneles oscuros corporativos
          darker: colors.slate[950],   // Fondo base corporativo oscuro
        },

        // Tokens semánticos de tipografía (Slate)
        content: {
          primary: colors.slate[900],   // Texto principal en fondos claros
          secondary: colors.slate[600], // Subtítulos / texto de apoyo
          muted: colors.slate[400],     // Placeholders y metadatos secundarios
          inverse: colors.slate[50],    // Texto claro para paneles oscuros
        },

        // ─── BOTONES PRINCIPALES Y LLAMADAS A LA ACCIÓN (Blue Clásico) ────────
        // Transmite solidez, seguridad bancaria e institucional
        primary: {
          50: colors.blue[50],
          100: colors.blue[100],
          200: colors.blue[200],
          300: colors.blue[300],
          400: colors.blue[400],
          500: colors.blue[500],
          600: colors.blue[600],       // Botón corporativo principal (DEFAULT)
          700: colors.blue[700],       // Estado Hover
          800: colors.blue[800],       // Estado Active / Pressed
          900: colors.blue[900],       // Encabezados de alto contraste
          950: colors.blue[950],
          DEFAULT: colors.blue[600],
          hover: colors.blue[700],
          active: colors.blue[800],
          focus: colors.blue[500],
        },

        // ─── ESTADOS DE 'DOCUMENTO VALIDADO' (Emerald) ────────────────────────
        // Transmite validación legal, certificación blockchain exitosa y autenticidad
        validated: {
          50: colors.emerald[50],       // Fondo de banners de documento válido
          100: colors.emerald[100],     // Fondo de badges / insignias de verificación
          200: colors.emerald[200],     // Borde suave de validación
          300: colors.emerald[300],     // Borde destacado de certificación
          400: colors.emerald[400],     // Acentos e iconos en dark mode
          500: colors.emerald[500],     // Iconos de verificación (CheckCircle)
          600: colors.emerald[600],     // Estado base de validado
          700: colors.emerald[700],     // Texto de éxito en modo claro
          800: colors.emerald[800],     // Texto oscuro de confirmación legal
          900: colors.emerald[900],
          950: colors.emerald[950],
          DEFAULT: colors.emerald[600],
          badge: colors.emerald[100],
          badgeText: colors.emerald[800],
          border: colors.emerald[300],
          glow: 'rgba(16, 185, 129, 0.25)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'corporate-sm': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'corporate': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
        'corporate-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.08)',
        'validated-glow': '0 0 20px -2px rgba(16, 185, 129, 0.35)',
      },
      borderRadius: {
        'corporate': '0.5rem',
        'corporate-lg': '0.75rem',
      },
    },
  },
  plugins: [],
};
