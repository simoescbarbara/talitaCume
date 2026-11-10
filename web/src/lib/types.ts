// Mirrors the Kotlin API's JSON (see the controllers in ../../../src/main/kotlin).

export type Role = "CLIENT" | "THERAPIST";

export type Account = {
  id: string;
  name: string;
  email: string;
  /** Digits only, with area code. */
  phone: string;
  role: Role;
};

export const TOPICS = [
  "ANXIETY",
  "DEPRESSION",
  "GRIEF",
  "SELF_ESTEEM",
  "RELATIONSHIPS",
  "MARRIAGE",
  "FAMILY",
  "MOTHERHOOD",
  "TRAUMA",
  "DOMESTIC_VIOLENCE",
  "BURNOUT",
  "FAITH_CRISIS",
] as const;
export type Topic = (typeof TOPICS)[number];

export const MODALITIES = ["ONLINE", "IN_PERSON", "BOTH"] as const;
export type Modality = (typeof MODALITIES)[number];

export type Therapist = {
  id: string;
  name: string;
  /** "06/123456": regional council / registration number. */
  crp: string;
  approach: string;
  bio: string;
  faithNote: string | null;
  topics: Topic[];
  city: string;
  modality: Modality;
  sessionMinutes: number;
  priceCents: number | null;
  /** Public profiles are always verified; a therapist sees `false` on her own until the CRP is checked. */
  verified: boolean;
};

export type TherapistProfileBody = {
  approach: string;
  bio: string;
  faithNote?: string;
  topics: Topic[];
  city: string;
  modality: Modality;
  sessionMinutes: number;
  priceCents?: number;
};

export type RegisterAccountBody = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export type RegisterTherapistBody = {
  account: RegisterAccountBody;
  crp: string;
  profile: TherapistProfileBody;
};

export type LoginBody = {
  email: string;
  password: string;
};

/** Instants in ISO-8601 UTC, e.g. "2026-10-26T12:00:00Z". */
export type Slot = {
  startsAt: string;
  endsAt: string;
};

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

/** Local times as "HH:mm" or "HH:mm:ss". */
export type AvailabilityRule = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

export type Appointment = {
  id: string;
  therapistId: string;
  therapistName: string;
  modality: Modality | "";
  startsAt: string;
  endsAt: string;
  status: "CONFIRMED" | "CANCELLED";
  note: string | null;
  wantsFaith: boolean;
  /** Only in the therapist's view. */
  client: { name: string; email: string; phone: string } | null;
};

export type BookAppointmentBody = {
  therapistId: string;
  startsAt: string;
  note?: string;
  wantsFaith: boolean;
};
