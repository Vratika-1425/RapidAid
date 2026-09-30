/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: '#F7F4EC',
        card: '#FFFFFF',
        ink: '#10201D',
        muted: '#5E6D69',
        line: '#E3DED1',
        forest: { 950: '#082B26', 900: '#0B3D36', 800: '#0F4F46', 700: '#13675B', 600: '#178172', 500: '#1FA08D', 100: '#D6F0EA', 50: '#EAF7F3' },
        saffron: { 500: '#F29B38', 400: '#F6B25F', 100: '#FDEBD1' },
        coral: { 600: '#D93C3C', 500: '#EA5B52', 100: '#FDE4E1' },
        sky: { 500: '#3B82C4', 100: '#DDEBF7' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,32,29,.04), 0 8px 24px -12px rgba(16,32,29,.12)',
        lift: '0 2px 4px rgba(16,32,29,.05), 0 18px 40px -16px rgba(16,32,29,.22)',
      },
      keyframes: {
        pulseRing: { '0%': { transform: 'scale(.6)', opacity: '.7' }, '100%': { transform: 'scale(2.4)', opacity: '0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: { pulseRing: 'pulseRing 2s cubic-bezier(.2,.6,.3,1) infinite', float: 'float 6s ease-in-out infinite', shimmer: 'shimmer 2.4s linear infinite' },
    },
  },
  plugins: [],
}
