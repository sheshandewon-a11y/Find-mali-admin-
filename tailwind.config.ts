
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: "#00F2FE",
          pink: "#FF007F",
          dark: "#080B14"
        }
      }
    }
  },
  plugins: []
};

export default config;
