import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(214 32% 91%)',
        bg: 'hsl(210 20% 98%)',
        panel: 'hsl(0 0% 100%)'
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
