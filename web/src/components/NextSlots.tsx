"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSlots } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import { dayParts, formatTime, nextDays } from "@/lib/dates";
import type { Slot } from "@/lib/types";

type Group = { date: string; slots: Slot[] };

type State = { status: "loading" } | { status: "error" } | { status: "ready"; groups: Group[] };

const MAX_DAYS = 3;
const MAX_TIMES_PER_DAY = 4;

/**
 * The profile page is cached and indexable, so free times are fetched in the browser:
 * they change every time someone books.
 */
export function NextSlots({ therapistId }: { therapistId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const days = nextDays(7);
    Promise.all(days.map((date) => fetchSlots(therapistId, date, controller.signal)))
      .then((perDay) => {
        const groups = perDay
          .map((slots, i) => ({ date: days[i], slots: slots.slice(0, MAX_TIMES_PER_DAY) }))
          .filter((group) => group.slots.length > 0)
          .slice(0, MAX_DAYS);
        setState({ status: "ready", groups });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [therapistId]);

  if (state.status === "loading") {
    return (
      <p className="status" role="status">
        {copy.profile.nextLoading}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p className="status status--error" role="alert">
        {copy.profile.nextError}
      </p>
    );
  }
  if (state.groups.length === 0) return <p className="status">{copy.profile.nextEmpty}</p>;

  return (
    <ul className="agenda">
      {state.groups.map(({ date, slots }) => {
        const p = dayParts(date);
        return (
          <li className="agenda__row" key={date}>
            <span className="agenda__day">{`${p.weekday}, ${p.day} ${p.month}`}</span>
            <span className="agenda__times">
              {slots.map((slot) => (
                <Link
                  className="agenda__time"
                  key={slot.startsAt}
                  href={`/terapeutas/${therapistId}/agendar?date=${date}&slot=${encodeURIComponent(slot.startsAt)}`}
                >
                  {formatTime(slot.startsAt)}
                </Link>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
