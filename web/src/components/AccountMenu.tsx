"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { copy } from "@/lib/copy";
import { firstName } from "@/lib/validation";
import { useAccount } from "./AccountProvider";

/** Guests: "Entrar" / "Criar conta". Signed in: greeting, "Minhas sessões" or "Meu painel", and "Sair". */
export function AccountMenu() {
  const { account, signOut } = useAccount();
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);

  // Keep the slot's height while the session loads, so the header doesn't jump.
  if (account.status === "loading") return <div className="account" aria-hidden="true" />;

  if (account.status === "guest") {
    // Come back to the current page after logging in (but not to the login or sign-up pages themselves).
    const next = pathname && !pathname.startsWith("/entrar") && !pathname.startsWith("/cadastro") && pathname !== "/" ? pathname : null;
    return (
      <nav className="account" aria-label={copy.account.menuLabel}>
        <Link className="account__link" href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"}>
          {copy.account.login}
        </Link>
        <Link className="account__link account__link--boxed" href="/cadastro">
          {copy.account.signUp}
        </Link>
      </nav>
    );
  }

  async function onLogout() {
    setLeaving(true);
    try {
      await signOut();
    } catch {
      setLeaving(false);
    }
  }

  const therapist = account.account.role === "THERAPIST";
  return (
    <nav className="account" aria-label={copy.account.menuLabel}>
      <span className="account__name">{copy.account.greeting(firstName(account.account.name))}</span>
      <Link className="account__link" href={therapist ? "/painel" : "/minhas-sessoes"}>
        {therapist ? copy.account.panel : copy.account.sessions}
      </Link>
      <button className="account__link account__link--boxed" type="button" onClick={onLogout} disabled={leaving}>
        {leaving ? copy.account.loggingOut : copy.account.logout}
      </button>
    </nav>
  );
}
