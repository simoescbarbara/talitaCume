// Used by client components. Calls same-origin /api/*, which next.config.ts proxies to the Kotlin API.
// The session lives in an HttpOnly cookie set by the API; same-origin fetches send it automatically.
import type {
  Account,
  Appointment,
  AvailabilityRule,
  BookAppointmentBody,
  LoginBody,
  RegisterAccountBody,
  RegisterTherapistBody,
  Slot,
  Therapist,
  TherapistProfileBody,
} from "./types";

export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    // The API answers errors as RFC 9457 problem details: { status, detail, ... }
    let detail = "";
    try {
      const problem = (await res.json()) as { detail?: string; title?: string };
      detail = problem.detail ?? problem.title ?? "";
    } catch {
      // Body was not JSON; the status code is enough.
    }
    throw new ClientApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

/** Creates a client account and signs her in. */
export function registerClient(body: RegisterAccountBody): Promise<Account> {
  return request<Account>("/api/accounts", json("POST", body));
}

/** Creates the therapist's account and profile and signs her in. */
export function registerTherapist(body: RegisterTherapistBody): Promise<{ account: Account; therapist: Therapist }> {
  return request("/api/therapists", json("POST", body));
}

export function login(body: LoginBody): Promise<Account> {
  return request<Account>("/api/auth/login", json("POST", body));
}

export function logout(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

/** The signed-in account, or null when there is no valid session. */
export async function fetchMe(): Promise<Account | null> {
  try {
    return await request<Account>("/api/auth/me", { cache: "no-store" });
  } catch (error) {
    if (error instanceof ClientApiError && error.status === 401) return null;
    throw error;
  }
}

export function fetchSlots(therapistId: string, date: string, signal?: AbortSignal): Promise<Slot[]> {
  return request<Slot[]>(`/api/therapists/${encodeURIComponent(therapistId)}/slots?date=${date}`, {
    cache: "no-store",
    signal,
  });
}

export function bookAppointment(body: BookAppointmentBody): Promise<Appointment> {
  return request<Appointment>("/api/appointments", json("POST", body));
}

export function fetchMyAppointments(): Promise<Appointment[]> {
  return request<Appointment[]>("/api/appointments/me", { cache: "no-store" });
}

export function cancelAppointment(id: string): Promise<Appointment> {
  return request<Appointment>(`/api/appointments/${encodeURIComponent(id)}/cancel`, { method: "PATCH" });
}

export function fetchMyProfile(): Promise<Therapist> {
  return request<Therapist>("/api/therapists/me", { cache: "no-store" });
}

export function updateMyProfile(body: TherapistProfileBody): Promise<Therapist> {
  return request<Therapist>("/api/therapists/me", json("PUT", body));
}

export function fetchMyAvailability(): Promise<AvailabilityRule[]> {
  return request<AvailabilityRule[]>("/api/therapists/me/availability", { cache: "no-store" });
}

export function saveMyAvailability(rules: AvailabilityRule[]): Promise<AvailabilityRule[]> {
  return request<AvailabilityRule[]>("/api/therapists/me/availability", json("PUT", { rules }));
}

// Admin calls carry the shared token in a header (never in the URL, so it stays out of logs and history).
const admin = (token: string): HeadersInit => ({ "X-Admin-Token": token });

/** Therapists waiting for someone to check their CRP. 403 for a wrong token. */
export function fetchPendingTherapists(token: string): Promise<Therapist[]> {
  return request<Therapist[]>("/api/admin/therapists/pending", { cache: "no-store", headers: admin(token) });
}

export function verifyTherapist(id: string, token: string): Promise<Therapist> {
  return request<Therapist>(`/api/admin/therapists/${encodeURIComponent(id)}/verify`, {
    method: "POST",
    headers: admin(token),
  });
}
