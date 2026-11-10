"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, logout } from "@/lib/client-api";
import type { Account as AccountData } from "@/lib/types";

export type Account =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "signed-in"; account: AccountData };

type AccountContext = {
  account: Account;
  /** Call after sign-up or login: the API has already set the session cookie. */
  signedIn: (account: AccountData) => void;
  /** Ends the session and reloads the home page, so no signed-in state survives in memory. */
  signOut: () => Promise<void>;
};

const Ctx = createContext<AccountContext | null>(null);

/**
 * Who is signed in, shared by the header and the pages. Lives in the root layout, so it survives navigation.
 * Loaded in the browser rather than on the server, so pages such as the therapist profile stay cacheable.
 */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((me) => active && setAccount(me ? { status: "signed-in", account: me } : { status: "guest" }))
      // If the API is unreachable, behave as signed out; pages that need the account will say so.
      .catch(() => active && setAccount({ status: "guest" }));
    return () => {
      active = false;
    };
  }, []);

  const signedIn = useCallback((me: AccountData) => setAccount({ status: "signed-in", account: me }), []);

  const signOut = useCallback(async () => {
    await logout();
    // A full load, not a client navigation: protected pages would otherwise see "guest" and bounce to login.
    window.location.assign("/");
  }, []);

  const value = useMemo(() => ({ account, signedIn, signOut }), [account, signedIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
