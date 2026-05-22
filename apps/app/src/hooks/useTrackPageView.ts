"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function pathToModule(pathname: string): string | null {
  if (pathname === "/dashboard") return "overview";
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  return match ? match[1] : null;
}

export function useTrackPageView(): void {
  const pathname = usePathname();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    if (pathname === lastTracked.current) return;
    lastTracked.current = pathname;
    const module = pathToModule(pathname);
    if (!module) return;
    void fetch("/api/track/page-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ module, path: pathname })
    });
  }, [pathname]);
}
