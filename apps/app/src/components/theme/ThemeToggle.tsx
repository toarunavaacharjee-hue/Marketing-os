"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark";

function getInitialMode(): Mode {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
  return "light";
}

export function ThemeToggle({
  className = "",
  variant = "subtle"
}: {
  className?: string;
  variant?: "subtle" | "pill";
}) {
  const [mode, setMode] = useState<Mode>(getInitialMode);

  useEffect(() => {
    setMode(getInitialMode());
  }, []);

  function apply(next: Mode) {
    const root = document.documentElement;
    if (next === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("aimw_theme", next);
    } catch {}
    setMode(next);
  }

  const isDark = mode === "dark";
  const base =
    variant === "pill"
      ? "rounded-full border px-3 py-2 text-[13px] font-semibold transition"
      : "rounded-lg border px-2.5 py-2 text-[13px] font-semibold transition";

  return (
    <button
      type="button"
      onClick={() => apply(isDark ? "light" : "dark")}
      className={`${base} ${className} border-border bg-surface2 text-text hover:bg-surface3`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="font-mono text-[12px]">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}

