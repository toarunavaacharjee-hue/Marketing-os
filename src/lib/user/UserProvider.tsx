/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type UserContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    setLoading(false);
  }

  useEffect(() => {
    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading, refresh }), [user, loading]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider />");
  return ctx;
}

