"use client";

import Link from "next/link";
import { forwardRef } from "react";

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-white">
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
    <div className={`rounded-2xl bg-surface shadow-card ${className}`}>
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
      className={`w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ${className}`}
      {...props}
    />
  );
});

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-sm text-white/75">{children}</div>;
}

export function Button({
  children,
  variant = "cta",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "cta" | "secondary" | "ghost";
}) {
  const styles =
    variant === "cta"
      ? "bg-cta text-black hover:brightness-105"
      : variant === "secondary"
        ? "bg-white/10 text-white hover:bg-white/15 border border-white/10"
        : "bg-transparent text-white/80 hover:text-white";

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition ${styles} ${className}`}
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
    <Link href={href} className="text-accent hover:text-accent/80">
      {children}
    </Link>
  );
}

