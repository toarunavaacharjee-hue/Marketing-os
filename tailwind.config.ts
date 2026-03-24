import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08080c",
        surface: "#141420",
        accent: "#7c6cff",
        cta: "#b8ff6c"
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
} satisfies Config;

