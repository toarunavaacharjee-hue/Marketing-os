import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        surface3: "var(--surface3)",
        border: "var(--border)",
        border2: "var(--border2)",
        accent: "var(--accent)",
        accent2: "var(--accent2)",
        accent3: "var(--accent3)",
        green: "var(--green)",
        yellow: "var(--yellow)",
        red: "var(--red)",
        pink: "var(--pink)",
        text: "var(--text)",
        text2: "var(--text2)",
        text3: "var(--text3)"
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
} satisfies Config;

