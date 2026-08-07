/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        "meteor": "meteor 5s linear infinite",
      },
      keyframes: {
        meteor: {
          "0%": { 
            transform: "rotate(var(--angle)) translateX(0)", 
            opacity: "1" 
          },
          "70%": { 
            opacity: "1" 
          },
          "100%": {
            transform: "rotate(var(--angle)) translateX(-800px)",
            opacity: "0",
          },
        },
      },
    },
  },
  plugins: [],
}