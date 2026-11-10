"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { fetchMyAppointments, fetchMyProfile, updateMyProfile } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import type { Appointment, Therapist } from "@/lib/types";
import { firstName } from "@/lib/validation";
import { useAccount } from "./AccountProvider";
import { AppointmentList } from "./AppointmentList";
import { AvailabilityEditor } from "./AvailabilityEditor";
import { Icon } from "./brand/Icon";
import { ProfileFields, draftFrom, toBody, validateDraft } from "./ProfileFields";

type Tab = "agenda" | "availability" | "profile";

type Loaded = { status: "loading" } | { status: "error" } | { status: "ready"; profile: Therapist; appointments: Appointment[] };

export function TherapistPanel() {
  const uid = useId();
  const { account } = useAccount();
  const [tab, setTab] = useState<Tab>("agenda");
  const [data, setData] = useState<Loaded>({ status: "loading" });
  const isTherapist = account.status === "signed-in" && account.account.role === "THERAPIST";

  useEffect(() => {
    if (!isTherapist) return;
    Promise.all([fetchMyProfile(), fetchMyAppointments()])
      .then(([profile, appointments]) => setData({ status: "ready", profile, appointments }))
      .catch(() => setData({ status: "error" }));
  }, [isTherapist]);

  if (account.status === "loading") return <p className="status">{copy.sessions.loading}</p>;
  if (account.status === "guest") {
    return (
      <>
        <h1 className="page-title">{copy.panel.pageTitle}</h1>
        <p className="status">{copy.panel.signIn}</p>
        <p className="panel-actions">
          <Link className="button" href="/entrar?next=%2Fpainel">
            {copy.account.login}
          </Link>
        </p>
      </>
    );
  }
  if (!isTherapist) {
    return (
      <>
        <h1 className="page-title">{copy.panel.pageTitle}</h1>
        <p className="status">{copy.panel.notTherapist}</p>
        <p className="panel-actions">
          <Link className="button" href="/minhas-sessoes">
            {copy.account.sessions}
          </Link>
        </p>
      </>
    );
  }
  if (data.status === "loading") return <p className="status">{copy.sessions.loading}</p>;
  if (data.status === "error") {
    return (
      <p className="status status--error" role="alert">
        {copy.error.body}
      </p>
    );
  }

  const { profile, appointments } = data;
  const tabs: Tab[] = ["agenda", "availability", "profile"];

  return (
    <>
      <h1 className="page-title">{copy.panel.title(firstName(account.account.name))}</h1>
      {profile.verified ? (
        <div className="notice">
          <p className="notice__title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icon name="shield" size={20} /> {copy.panel.live}
          </p>
          <p>
            <Link className="link-button" href={`/terapeutas/${profile.id}`}>
              {copy.panel.liveAction}
            </Link>
          </p>
        </div>
      ) : (
        <div className="notice">
          <p className="notice__title">{copy.panel.pending}</p>
          <p>{copy.panel.pendingBody}</p>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label={copy.panel.pageTitle}>
        {tabs.map((t) => (
          <button
            key={t}
            className="tab"
            role="tab"
            id={`${uid}-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`${uid}-panel`}
            onClick={() => setTab(t)}
            type="button"
          >
            {copy.panel.tabs[t]}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
        {tab === "agenda" &&
          (appointments.length === 0 ? (
            <p className="status">{copy.panel.agendaEmpty}</p>
          ) : (
            <>
              <h2 className="section-title">{copy.panel.agendaTitle}</h2>
              <AppointmentList
                items={appointments}
                view="therapist"
                onChange={(updated) =>
                  setData({ ...data, appointments: appointments.map((a) => (a.id === updated.id ? updated : a)) })
                }
              />
            </>
          ))}
        {tab === "availability" && <AvailabilityEditor sessionMinutes={profile.sessionMinutes} />}
        {tab === "profile" && (
          <ProfileEditor profile={profile} onSaved={(saved) => setData({ ...data, profile: saved })} />
        )}
      </div>
    </>
  );
}

function ProfileEditor({ profile, onSaved }: { profile: Therapist; onSaved: (profile: Therapist) => void }) {
  const uid = useId();
  const [draft, setDraft] = useState(() => draftFrom(profile));
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const errors = validateDraft(draft);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    setStatus("saving");
    try {
      onSaved(await updateMyProfile(toBody(draft)));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="auth--wide">
      <h2 className="section-title">{copy.profileForm.title}</h2>
      <p className="page-sub">{copy.profile.crp(profile.crp)}</p>
      <ProfileFields
        uid={uid}
        draft={draft}
        onChange={(d) => {
          setDraft(d);
          setStatus("idle");
        }}
        errors={submitted ? errors : {}}
      />
      <div className="panel-actions">
        <button className="button" type="submit" disabled={status === "saving"}>
          {status === "saving" ? copy.profileForm.saving : copy.profileForm.save}
        </button>
      </div>
      <div aria-live="polite">
        {status === "saved" && <p className="form-ok">{copy.profileForm.saved}</p>}
        {status === "error" && <p className="form-error">{copy.profileForm.error}</p>}
      </div>
    </form>
  );
}
