/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tea: {
          50: "#fbf8f3",
          100: "#f5eee2",
          200: "#e9dac4",
          300: "#d9be9e",
          400: "#c79e76",
          500: "#b58055",
          600: "#9d6645",
          700: "#7c4e37",
          800: "#643f30",
          900: "#53352a",
        },
      },
    },
  },
  plugins: [],
};
