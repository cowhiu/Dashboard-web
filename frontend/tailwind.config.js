/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 24px 60px rgba(15, 23, 42, 0.24)",
      },
      colors: {
        surface: "#07131f",
        panel: "#0f1d2e",
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        sans: ["IBM Plex Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
