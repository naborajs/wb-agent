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
        ed: {
          bg: "var(--ed-bg)",
          surface: "var(--ed-surface)",
          border: "var(--ed-border)",
          "text-primary": "var(--ed-text-primary)",
          "text-muted": "var(--ed-text-muted)",
          accent: "var(--ed-accent)",
          "accent-hover": "var(--ed-accent-hover)",
          success: "var(--ed-success)",
          warning: "var(--ed-warning)",
          danger: "var(--ed-danger)",
        },
      },
      boxShadow: {
        "ed-panel": "var(--ed-shadow-panel)",
        "ed-elevated": "var(--ed-shadow-elevated)",
      },
      fontFamily: {
        sans: [
          "var(--font-instrument)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        data: [
          "var(--font-jetbrains)",
          "JetBrains Mono",
          "Fira Code",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
