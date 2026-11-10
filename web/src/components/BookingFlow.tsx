"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ClientApiError, bookAppointment, fetchSlots } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import { dayParts, formatLongDate, formatTime, icsDataUrl } from "@/lib/dates";
import type { Appointment, Slot, Therapist } from "@/lib/types";
import { useAccount } from "./AccountProvider";
import { Icon } from "./brand/Icon";
import { Field } from "./Field";

type Props = {
  therapist: Therapist;
  /** Selectable days as YYYY-MM-DD in local time, computed on the server. */
  days: string[];
  initialDate?: string;
  /** ISO instant of a slot to preselect, e.g. when arriving from the profile page. */
  initialSlot?: string;
};

type SlotsState = { status: "loading" } | { status: "error" } | { status: "ready"; items: Slot[] };

export function BookingFlow({ therapist, days, initialDate, initialSlot }: Props) {
  const uid = useId();
  const { account } = useAccount();
  const [date, setDate] = useState(initialDate && days.includes(initialDate) ? initialDate : days[0]);
  const [slots, setSlots] = useState<SlotsState>({ status: "loading" });
  const [selected, setSelected] = useState<string | null>(initialSlot ?? null);
  const [reloadKey, setReloadKey] = useState(0);

  const [note, setNote] = useState("");
  const [wantsFaith, setWantsFaith] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setSlots({ status: "loading" });
    fetchSlots(therapist.id, date, controller.signal)
      .then((items) => {
        setSlots({ status: "ready", items });
        // Keep the selection only if that time is still free on this day.
        setSelected((current) => (current && items.some((s) => s.startsAt === current) ? current : null));
      })
      .catch(() => {
        if (!controller.signal.aborted) setSlots({ status: "error" });
      });
    return () => controller.abort();
  }, [therapist.id, date, reloadKey]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!selected) return;

    setSaving(true);
    try {
      const appointment = await bookAppointment({
        therapistId: therapist.id,
        startsAt: selected,
        wantsFaith,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setConfirmed(appointment);
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 409) {
        // Someone else got there first: say so, and show the day's remaining times.
        setFormError(copy.booking.slotTaken);
        setSelected(null);
        setReloadKey((k) => k + 1);
      } else {
        setFormError(copy.booking.genericError);
      }
    } finally {
      setSaving(false);
    }
  }

  if (confirmed) return <Confirmation appointment={confirmed} />;

  return (
    <>
      <h1 className="page-title">{copy.booking.title(therapist.name)}</h1>
      <p className="page-sub">
        {therapist.approach} · {copy.modality[therapist.modality]} · {copy.profile.session(therapist.sessionMinutes)}
      </p>
      <div className="booking">
        <section aria-labelledby={`${uid}-pick`}>
          <h2 className="section-title" id={`${uid}-pick`}>
            {copy.booking.pickTitle}
          </h2>
          <DayPicker days={days} value={date} onChange={setDate} />
          <SlotList
            state={slots}
            selected={selected}
            onSelect={setSelected}
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        </section>

        <aside className="booking__aside" aria-label={copy.booking.detailsTitle}>
          <p className={selected ? "summary__when summary__when--set" : "summary__when"} aria-live="polite">
            {selected ? copy.confirmation.when(formatLongDate(selected), formatTime(selected)) : copy.booking.noneChosen}
          </p>

          {account.status === "loading" ? null : account.status === "guest" ? (
            <SignInPrompt date={date} slot={selected} />
          ) : account.account.role !== "CLIENT" ? (
            <p className="notice">{copy.booking.therapistCannotBook}</p>
          ) : (
            <form noValidate onSubmit={onSubmit}>
              <Field
                id={`${uid}-note`}
                label={copy.booking.noteLabel}
                hint={copy.booking.noteHint}
                error={null}
                input={{ value: note, onChange: setNote, multiline: true, maxLength: 1000 }}
              />
              <label className="check">
                <input type="checkbox" checked={wantsFaith} onChange={(e) => setWantsFaith(e.target.checked)} />
                <span>{copy.booking.faithLabel}</span>
                <span className="check__hint">{copy.booking.faithHint}</span>
              </label>

              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="booking__submit">
                <button className="button button--block" type="submit" disabled={saving || !selected}>
                  {saving ? copy.booking.saving : copy.booking.confirm}
                </button>
                {!selected && <p className="hint">{copy.booking.chooseSlotHint}</p>}
              </div>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}

/** Guests keep their chosen day and time: login and sign-up both bring them back to it. */
function SignInPrompt({ date, slot }: { date: string; slot: string | null }) {
  const pathname = usePathname();
  const params = new URLSearchParams({ date, ...(slot ? { slot } : {}) });
  const next = encodeURIComponent(`${pathname}?${params.toString()}`);
  return (
    <div className="notice">
      <p className="notice__title">{copy.booking.signInTitle}</p>
      <p>{copy.booking.signInBody}</p>
      <div className="panel-actions">
        <Link className="button" href={`/cadastro?next=${next}`}>
          {copy.account.signUp}
        </Link>
        <Link className="button button--quiet" href={`/entrar?next=${next}`}>
          {copy.account.login}
        </Link>
      </div>
    </div>
  );
}

function Confirmation({ appointment }: { appointment: Appointment }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Move focus to the outcome heading so screen readers announce it.
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="confirm">
      <h1 className="page-title confirm__title" ref={headingRef} tabIndex={-1}>
        {copy.confirmation.title}
      </h1>
      <p className="page-sub">{copy.confirmation.lead(appointment.therapistName)}</p>
      <dl className="facts">
        <div className="facts__row">
          <dt className="facts__label">{copy.confirmation.whenLabel}</dt>
          <dd className="facts__value">
            {copy.confirmation.when(formatLongDate(appointment.startsAt), formatTime(appointment.startsAt))}
          </dd>
        </div>
        <div className="facts__row">
          <dt className="facts__label">{copy.confirmation.withLabel}</dt>
          <dd className="facts__value">{appointment.therapistName}</dd>
        </div>
        {appointment.modality && (
          <div className="facts__row">
            <dt className="facts__label">{copy.confirmation.howLabel}</dt>
            <dd className="facts__value">{copy.modality[appointment.modality]}</dd>
          </div>
        )}
      </dl>
      <div className="confirm__actions">
        <a
          className="button"
          download="sessao-talita-cumi.ics"
          href={icsDataUrl({
            id: appointment.id,
            startsAt: appointment.startsAt,
            endsAt: appointment.endsAt,
            summary: copy.confirmation.calendarSummary,
          })}
        >
          <Icon name="clock" size={20} />
          {copy.confirmation.calendar}
        </a>
        <Link className="button button--quiet" href="/minhas-sessoes">
          {copy.confirmation.mySessions}
        </Link>
      </div>
    </div>
  );
}

function DayPicker({ days, value, onChange }: { days: string[]; value: string; onChange: (date: string) => void }) {
  return (
    <div className="days" role="group" aria-label={copy.booking.dayGroup}>
      {days.map((day) => {
        const p = dayParts(day);
        return (
          <button key={day} type="button" className="day" aria-pressed={day === value} onClick={() => onChange(day)}>
            <span className="day__weekday">{p.weekday}</span>
            <span className="day__number">{p.day}</span>
            <span className="day__month">{p.month}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlotList({
  state,
  selected,
  onSelect,
  onRetry,
}: {
  state: SlotsState;
  selected: string | null;
  onSelect: (startsAt: string) => void;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return (
      <p className="status" role="status">
        {copy.booking.loadingSlots}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <div className="status status--error" role="alert">
        <p>{copy.booking.slotsError}</p>
        <button className="link-button" type="button" onClick={onRetry}>
          {copy.booking.retry}
        </button>
      </div>
    );
  }
  if (state.items.length === 0) return <p className="status">{copy.booking.noSlots}</p>;

  return (
    <ul className="slots">
      {state.items.map((slot) => {
        const active = slot.startsAt === selected;
        return (
          <li key={slot.startsAt}>
            <button type="button" className="slot" aria-pressed={active} onClick={() => onSelect(slot.startsAt)}>
              <span className="slot__time">{formatTime(slot.startsAt)}</span>
              <span className="slot__state">{active ? copy.booking.yourSlot : copy.booking.freeSlot}</span>
              {active && <Icon name="check" size={20} className="slot__check" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
