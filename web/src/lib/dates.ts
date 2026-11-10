// Appointments are instants (UTC) but people think in local time.
// Keep this equal to `app.timezone` in the Kotlin application.yml.
export const LOCAL_TZ = "America/Sao_Paulo";

const dateKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: LOCAL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: LOCAL_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const longDateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: LOCAL_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const weekdayShort = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" });
const monthShort = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Today's date in local time, as YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  return dateKey.format(now); // en-CA formats as YYYY-MM-DD
}

/** Calendar arithmetic on YYYY-MM-DD strings. Uses noon UTC so daylight-saving never shifts the day. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}

export function nextDays(count: number, from: string = todayLocal()): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

/** "09:30" in local time. */
export function formatTime(instant: string): string {
  return timeFmt.format(new Date(instant));
}

/** "terça-feira, 27 de outubro" in local time. */
export function formatLongDate(instant: string): string {
  return longDateFmt.format(new Date(instant));
}

/** Pieces for a day button: { weekday: "ter", day: 27, month: "out" }. */
export function dayParts(isoDate: string): { weekday: string; day: number; month: string } {
  const noon = new Date(`${isoDate}T12:00:00Z`);
  return {
    weekday: weekdayShort.format(noon).replace(".", ""),
    day: noon.getUTCDate(),
    month: monthShort.format(noon).replace(".", ""),
  };
}

export const formatPrice = (cents: number) => money.format(cents / 100);

/** "09:00:00" → "09:00". */
export const hhmm = (time: string) => time.slice(0, 5);

const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsEscape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** A downloadable .ics file as a data URL. The summary stays discreet: calendars are often shared. */
export function icsDataUrl(event: { id: string; startsAt: string; endsAt: string; summary: string }): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Talita Cumi//Agenda//PT",
    "BEGIN:VEVENT",
    `UID:${event.id}@talitacumi`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(new Date(event.startsAt))}`,
    `DTEND:${icsStamp(new Date(event.endsAt))}`,
    `SUMMARY:${icsEscape(event.summary)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
}
