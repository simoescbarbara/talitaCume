// Used by server components only. Reads API_URL, which must not reach the browser.
import type { Modality, Therapist, Topic } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) throw new ApiError(res.status, `API answered ${res.status} for ${path}`);
  return (await res.json()) as T;
}

export function searchTherapists(filters: { topic?: Topic; modality?: Modality; q?: string }): Promise<Therapist[]> {
  const params = new URLSearchParams();
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.modality) params.set("modality", filters.modality);
  if (filters.q) params.set("q", filters.q);
  return getJson<Therapist[]>(`/api/therapists?${params.toString()}`, { cache: "no-store" });
}

/** Returns null when the therapist does not exist, is not verified yet, or the id is not a valid UUID. */
export async function getTherapist(id: string): Promise<Therapist | null> {
  try {
    return await getJson<Therapist>(`/api/therapists/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}
