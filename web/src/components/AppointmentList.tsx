"use client";

import { useState } from "react";
import { cancelAppointment } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import { formatLongDate, formatTime } from "@/lib/dates";
import type { Appointment } from "@/lib/types";

/**
 * One list for both sides. Clients see who they're meeting; therapists also see the client's contact,
 * what she chose to share and whether she asked for faith in the sessions.
 */
export function AppointmentList({
  items,
  view,
  onChange,
}: {
  items: Appointment[];
  view: "client" | "therapist";
  onChange: (updated: Appointment) => void;
}) {
  return (
    <ul className="sessions">
      {items.map((a) => (
        <AppointmentItem key={a.id} appointment={a} view={view} onChange={onChange} />
      ))}
    </ul>
  );
}

function AppointmentItem({
  appointment: a,
  view,
  onChange,
}: {
  appointment: Appointment;
  view: "client" | "therapist";
  onChange: (updated: Appointment) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(false);

  const cancelled = a.status === "CANCELLED";
  const started = new Date(a.startsAt).getTime() <= Date.now();
  const tag = cancelled ? copy.sessions.cancelled : started ? copy.sessions.past : null;
  const who = view === "therapist" ? (a.client?.name ?? "") : a.therapistName;

  async function onCancel() {
    setCancelling(true);
    setError(false);
    try {
      onChange(await cancelAppointment(a.id));
    } catch {
      setError(true);
      setCancelling(false);
    }
  }

  return (
    <li className={cancelled || started ? "session session--muted" : "session"}>
      <div className="session__head">
        <p className="session__when">{copy.confirmation.when(formatLongDate(a.startsAt), formatTime(a.startsAt))}</p>
        {tag && <span className="session__tag">{tag}</span>}
      </div>
      <p className="session__who">
        {copy.sessions.with(who)}
        {a.modality && ` · ${copy.modality[a.modality]}`}
      </p>

      {(a.client || a.note || a.wantsFaith) && (
        <dl className="session__details">
          {a.client && (
            <div>
              <dt>{copy.panel.clientContact}</dt>
              <dd>
                <a href={`mailto:${a.client.email}`}>{a.client.email}</a> ·{" "}
                <a href={`tel:+55${a.client.phone}`}>{a.client.phone}</a>
              </dd>
            </div>
          )}
          {a.wantsFaith && (
            <div>
              <dd>{view === "therapist" ? copy.panel.faith : copy.sessions.faith}</dd>
            </div>
          )}
          {a.note && (
            <div>
              <dt>{view === "therapist" ? copy.panel.note : copy.sessions.note}</dt>
              <dd>{a.note}</dd>
            </div>
          )}
        </dl>
      )}

      {!cancelled && !started && (
        <div className="session__actions">
          {confirming ? (
            <>
              <span>{copy.sessions.cancelSure}</span>
              <button className="button button--danger" type="button" onClick={onCancel} disabled={cancelling}>
                {cancelling ? copy.sessions.cancelling : copy.sessions.cancelYes}
              </button>
              <button className="button button--quiet" type="button" onClick={() => setConfirming(false)} disabled={cancelling}>
                {copy.sessions.cancelNo}
              </button>
            </>
          ) : (
            <button className="link-button" type="button" onClick={() => setConfirming(true)}>
              {copy.sessions.cancel}
            </button>
          )}
          {error && (
            <p className="field__error" role="alert">
              {copy.sessions.cancelError}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
