"use client";

import { useEffect, useId, useState } from "react";
import { ClientApiError, fetchMyAvailability, saveMyAvailability } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import { hhmm } from "@/lib/dates";
import type { AvailabilityRule, DayOfWeek } from "@/lib/types";
import { Field } from "./Field";

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

type Row = AvailabilityRule & { key: number };

/** Mirrors SchedulingService.replaceAvailability: end after start, no overlaps within a day. */
function isValid(rows: Row[]): boolean {
  if (rows.some((r) => !(r.startTime < r.endTime))) return false;
  return DAYS.every((day) => {
    const sorted = rows.filter((r) => r.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return sorted.every((r, i) => i === 0 || sorted[i - 1].endTime <= r.startTime);
  });
}

type Status = "loading" | "idle" | "saving" | "saved" | "invalid" | "error";

/** Weekly windows; the API cuts sessions from them. Saving replaces the whole week. */
export function AvailabilityEditor({ sessionMinutes }: { sessionMinutes: number }) {
  const uid = useId();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [nextKey, setNextKey] = useState(0);

  const fromApi = (rules: AvailabilityRule[]) =>
    rules.map((r, i) => ({ dayOfWeek: r.dayOfWeek, startTime: hhmm(r.startTime), endTime: hhmm(r.endTime), key: i }));

  useEffect(() => {
    fetchMyAvailability()
      .then((rules) => {
        setRows(fromApi(rules));
        setNextKey(rules.length);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, []);

  const update = (key: number, patch: Partial<AvailabilityRule>) => {
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setStatus("idle");
  };

  function add() {
    const last = rows.at(-1);
    const day = last ? DAYS[(DAYS.indexOf(last.dayOfWeek) + 1) % 7] : "MONDAY";
    setRows([...rows, { key: nextKey, dayOfWeek: day, startTime: "09:00", endTime: "12:00" }]);
    setNextKey(nextKey + 1);
    setStatus("idle");
  }

  async function save() {
    if (!isValid(rows)) {
      setStatus("invalid");
      return;
    }
    setStatus("saving");
    try {
      const saved = await saveMyAvailability(rows.map(({ key: _key, ...rule }) => rule));
      setRows(fromApi(saved));
      setNextKey(saved.length);
      setStatus("saved");
    } catch (error) {
      setStatus(error instanceof ClientApiError && error.status === 400 ? "invalid" : "error");
    }
  }

  if (status === "loading") return <p className="status">{copy.sessions.loading}</p>;

  return (
    <section aria-labelledby={`${uid}-title`}>
      <h2 className="section-title" id={`${uid}-title`}>
        {copy.availability.title}
      </h2>
      <p className="page-sub">{copy.availability.lead(sessionMinutes)}</p>
      {rows.length === 0 ? (
        <p className="status">{copy.availability.empty}</p>
      ) : (
        <ul className="windows">
          {rows.map((row, i) => (
            <li className="window" key={row.key}>
              <Field
                id={`${uid}-day-${row.key}`}
                label={copy.availability.day}
                error={null}
                input={{
                  value: row.dayOfWeek,
                  onChange: (v) => update(row.key, { dayOfWeek: v as DayOfWeek }),
                  options: DAYS.map((d) => ({ value: d, label: copy.days[d] })),
                }}
              />
              <Field
                id={`${uid}-from-${row.key}`}
                label={copy.availability.from}
                error={null}
                input={{ value: row.startTime, onChange: (v) => update(row.key, { startTime: v }), type: "time" }}
              />
              <Field
                id={`${uid}-to-${row.key}`}
                label={copy.availability.to}
                error={null}
                input={{ value: row.endTime, onChange: (v) => update(row.key, { endTime: v }), type: "time" }}
              />
              <button
                className="button button--quiet window__remove"
                type="button"
                aria-label={`${copy.availability.remove} ${i + 1}`}
                onClick={() => {
                  setRows(rows.filter((r) => r.key !== row.key));
                  setStatus("idle");
                }}
              >
                {copy.availability.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="panel-actions">
        <button className="button button--quiet" type="button" onClick={add}>
          {copy.availability.add}
        </button>
        <button className="button" type="button" onClick={save} disabled={status === "saving"}>
          {status === "saving" ? copy.availability.saving : copy.availability.save}
        </button>
      </div>
      <div aria-live="polite">
        {status === "saved" && <p className="form-ok">{copy.availability.saved}</p>}
        {status === "invalid" && <p className="form-error">{copy.availability.invalid}</p>}
        {status === "error" && <p className="form-error">{copy.availability.error}</p>}
      </div>
    </section>
  );
}
