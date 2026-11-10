/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#EFEFEF', // Signature LEVIX canvas off-white
        'canvas-pure': '#FFFFFF',
        'canvas-alt': '#E8E8E8',
        brand: {
          orange: '#FF5400',
          blue: '#183B7E',
          black: '#000000',
        },
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        logo: ['"Archivo Black"', 'Inter', 'sans-serif'],
        mono: ['"SF Mono"', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        widest: '0.15em',
        superwide: '0.25em',
      },
      aspectRatio: {
        '3/4': '3 / 4',
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
