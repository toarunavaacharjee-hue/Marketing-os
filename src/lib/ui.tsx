"use client";

import Link from "next/link";
import { forwardRef } from "react";

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">{children}</div>
    </div>
  );
}

export function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-border bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-3 text-text placeholder:text-text3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ${className}`}
      {...props}
    />
  );
});

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-semibold tracking-[0.3px] text-text2">
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "green";
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-[#5b52ee]"
      : variant === "secondary"
        ? "bg-surface2 text-text hover:bg-surface3 border border-border hover:border-border2"
        : variant === "green"
          ? "bg-[rgba(52,211,153,0.15)] text-green border border-[rgba(52,211,153,0.3)] hover:bg-[rgba(52,211,153,0.25)]"
        : "bg-transparent text-white/80 hover:text-white";

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius2)] px-4 py-3 text-sm font-semibold transition ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextLink({
  href,
  children
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-accent2 hover:text-accent">
      {children}
    </Link>
  );
}

