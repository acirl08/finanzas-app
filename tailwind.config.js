/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // App chrome
        app: '#FAFAF7',
        surface: '#FFFFFF',
        subtle: '#F3F1EC',
        // Ink (text + borders + inverse surface)
        ink: {
          50:  '#F3F1EC',
          100: '#E8E5DC',
          200: '#D2CEC1',
          300: '#A09E96',
          400: '#8A877E',
          500: '#6B6960',
          600: '#4A4841',
          700: '#2E2C27',
          800: '#222019',
          900: '#1A1A1A',
        },
        // Brand — verde bosque (confianza, calma)
        sage: {
          50:  '#F0F5F2',
          100: '#DCE9E0',
          200: '#B8D3C1',
          300: '#8DB79B',
          400: '#5F9877',
          500: '#2F7D57',
          600: '#256244',
          700: '#1B4A33',
          800: '#143528',
          900: '#0D2319',
        },
        // Warm accents (ahorro / próximas metas)
        honey: {
          50:  '#FBF4E4',
          100: '#F5E6BE',
          500: '#B8860B',
          600: '#8B6914',
        },
        // Danger — terracota
        clay: {
          50:  '#FBEFED',
          100: '#F3D8D2',
          500: '#A84238',
          600: '#83332B',
        },
        // Info — azul polvo
        dust: {
          50:  '#EEF2F6',
          100: '#D8E1EA',
          500: '#4A6B85',
          600: '#345068',
        },

        // Legacy aliases (mientras migramos pantallas antiguas; eliminar al terminar)
        primary: {
          50:  '#F0F5F2',
          100: '#DCE9E0',
          500: '#2F7D57',
          600: '#256244',
          700: '#1B4A33',
        },
        success: '#2F7D57',
        warning: '#B8860B',
        danger: '#A84238',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-xl': ['60px', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display-lg': ['48px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display':    ['36px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(26, 26, 26, 0.04), 0 1px 3px rgba(26, 26, 26, 0.02)',
        'lift': '0 4px 12px rgba(26, 26, 26, 0.06), 0 2px 4px rgba(26, 26, 26, 0.03)',
        'ring-sage': '0 0 0 3px rgba(47, 125, 87, 0.15)',
        'ring-clay': '0 0 0 3px rgba(168, 66, 56, 0.15)',
      },
    },
  },
  plugins: [],
}
