import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff8ff",
          100: "#dbeefe",
          500: "#2e86de",
          600: "#1f6fc4",
          700: "#195aa0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
