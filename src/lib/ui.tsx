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
      className={`rounded-[var(--radius)] border border-border bg-surface shadow-card transition-[border-color,box-shadow] duration-200 ease-aimw-out ${className}`}
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
      className={`w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus ${className}`}
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
  variant?: "primary" | "secondary" | "ghost" | "green" | "brand";
}) {
  const styles =
    variant === "primary"
      ? "bg-[var(--btn-neutral-bg)] text-on-dark hover:bg-[var(--btn-neutral-hover)]"
      : variant === "brand"
        ? "bg-primary text-on-dark shadow-sm hover:bg-primary-dark focus-visible:shadow-focus"
        : variant === "secondary"
          ? "border border-input-border bg-surface text-text hover:bg-surface2"
          : variant === "green"
            ? "border border-[color-mix(in_srgb,var(--color-teal)_40%,var(--border-default))] bg-[color-mix(in_srgb,var(--color-teal)_14%,var(--bg-surface))] text-[var(--color-teal)] hover:bg-[color-mix(in_srgb,var(--color-teal)_22%,var(--bg-surface))]"
            : "bg-transparent text-text2 hover:bg-surface2 hover:text-text";

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm px-4 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-aimw-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none ${styles} ${className}`}
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
    <Link href={href} className="font-medium text-link hover:underline">
      {children}
    </Link>
  );
}

