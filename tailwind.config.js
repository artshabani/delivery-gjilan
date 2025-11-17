/** @type {import('tailwindcss').Config} */
module.exports = {

  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],

  darkMode: "class",

  theme: {
    extend: {
      keyframes: {
        cartBreath: {
          "0%":   { transform: "scale(1)",   boxShadow: "0 0 0px rgba(168,85,247,0.4)" },
          "50%":  { transform: "scale(1.08)", boxShadow: "0 0 12px rgba(168,85,247,0.7)" },
          "100%": { transform: "scale(1)",   boxShadow: "0 0 0px rgba(168,85,247,0.4)" },
        },
      },
      animation: {
        cartBreath: "cartBreath 1.8s ease-in-out infinite",
      },
    },
  },

  

  plugins: [],

  
};


