"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMyAppointments } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import type { Appointment } from "@/lib/types";
import { useAccount } from "./AccountProvider";
import { AppointmentList } from "./AppointmentList";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; items: Appointment[] };

export function SessionsScreen() {
  const { account } = useAccount();
  const [state, setState] = useState<State>({ status: "loading" });
  const signedIn = account.status === "signed-in";

  useEffect(() => {
    if (!signedIn) return;
    fetchMyAppointments()
      .then((items) => setState({ status: "ready", items }))
      .catch(() => setState({ status: "error" }));
  }, [signedIn]);

  if (account.status === "loading") return <p className="status">{copy.sessions.loading}</p>;
  if (account.status === "guest") {
    return (
      <>
        <h1 className="page-title">{copy.sessions.title}</h1>
        <p className="status">{copy.sessions.signIn}</p>
        <p className="panel-actions">
          <Link className="button" href="/entrar?next=%2Fminhas-sessoes">
            {copy.account.login}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">{copy.sessions.title}</h1>
      <p className="page-sub">{copy.sessions.lead}</p>
      {state.status === "loading" ? (
        <p className="status" role="status">
          {copy.sessions.loading}
        </p>
      ) : state.status === "error" ? (
        <p className="status status--error" role="alert">
          {copy.sessions.error}
        </p>
      ) : state.items.length === 0 ? (
        <>
          <p className="status">{copy.sessions.empty}</p>
          <p className="panel-actions">
            <Link className="button" href="/#terapeutas">
              {copy.sessions.find}
            </Link>
          </p>
        </>
      ) : (
        <AppointmentList
          items={state.items}
          view="client"
          onChange={(updated) =>
            setState({ status: "ready", items: state.items.map((a) => (a.id === updated.id ? updated : a)) })
          }
        />
      )}
    </>
  );
}
