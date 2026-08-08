/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        indigo: {
          950: "#171a3d",
          900: "#1f2350",
          700: "#33379b",
          600: "#4b4fe0",
          500: "#6a6ef0",
          400: "#9296f5",
        },
        lavender: {
          100: "#eeeefc",
        },
        paper: "#fbfaff",
        ink: {
          DEFAULT: "#171a3d",
          soft: "#5a5d84",
        },
        line: "#e3e2f5",
        coral: {
          DEFAULT: "#ff7a59",
          dark: "#e85f3d",
        },
        brand: {
          green: "#2fbf71",
        },
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      boxShadow: {
        lg2: "0 24px 60px -20px rgba(23,26,61,0.35)",
        sm2: "0 8px 24px -12px rgba(23,26,61,0.18)",
      },
      borderRadius: {
        xl2: "18px",
      },
    },
  },
  plugins: [],
};