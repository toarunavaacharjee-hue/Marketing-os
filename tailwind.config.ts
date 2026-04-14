import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        page: "var(--bg-page)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        surface3: "var(--surface3)",
        border: "var(--border)",
        border2: "var(--border2)",
        "input-border": "var(--border-input)",
        accent: "var(--accent)",
        accent2: "var(--accent2)",
        accent3: "var(--accent3)",
        primary: "var(--color-primary)",
        "primary-dark": "var(--color-primary-dark)",
        "primary-light": "var(--color-primary-light)",
        amber: "var(--color-amber)",
        "amber-hover": "var(--color-amber-hover)",
        teal: "var(--color-teal)",
        link: "var(--color-link)",
        heading: "var(--text-heading)",
        "on-dark": "var(--text-on-dark)",
        sidebar: "var(--bg-sidebar)",
        "sidebar-active": "var(--bg-sidebar-active)",
        green: "var(--green)",
        yellow: "var(--yellow)",
        red: "var(--red)",
        pink: "var(--pink)",
        text: "var(--text)",
        text2: "var(--text2)",
        text3: "var(--text3)"
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)"
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        modal: "var(--shadow-modal)",
        dropdown: "var(--shadow-dropdown)",
        focus: "var(--shadow-focus)",
        saas: "0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px rgba(0,0,0,0.45)"
      },
      transitionTimingFunction: {
        "aimw-out": "cubic-bezier(0.33, 1, 0.68, 1)"
      },
      transitionDuration: {
        250: "250ms"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
} satisfies Config;
