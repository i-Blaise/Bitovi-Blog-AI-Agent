/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b0d12",
          850: "#0f1117",
          800: "#13151d",
          750: "#181b24",
          700: "#1e222d",
          600: "#272c39",
          500: "#3a4150",
        },
        bone: {
          DEFAULT: "#f0ede8",
          soft: "#cbc8c2",
          dim: "#8d8a85",
        },
        brand: {
          DEFAULT: "#e63329",
          600: "#cf2c23",
          300: "#ff6b62",
          glow: "rgba(230,51,41,0.30)",
        },
        ok: "#54b87a",
        warn: "#e0a830",
        bad: "#e6584a",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
