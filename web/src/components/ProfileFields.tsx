"use client";

import { copy } from "@/lib/copy";
import { MODALITIES, TOPICS } from "@/lib/types";
import type { Modality, Therapist, TherapistProfileBody, Topic } from "@/lib/types";
import { priceToCents } from "@/lib/validation";
import { Field } from "./Field";

/** What the form edits: strings for the number fields, so half-typed values don't get coerced. */
export type ProfileDraft = {
  approach: string;
  bio: string;
  faithNote: string;
  topics: Topic[];
  city: string;
  modality: Modality;
  sessionMinutes: string;
  price: string;
};

export const emptyDraft: ProfileDraft = {
  approach: "",
  bio: "",
  faithNote: "",
  topics: [],
  city: "",
  modality: "ONLINE",
  sessionMinutes: "50",
  price: "",
};

export function draftFrom(t: Therapist): ProfileDraft {
  return {
    approach: t.approach,
    bio: t.bio,
    faithNote: t.faithNote ?? "",
    topics: t.topics,
    city: t.city,
    modality: t.modality,
    sessionMinutes: String(t.sessionMinutes),
    price: t.priceCents != null ? (t.priceCents / 100).toFixed(2).replace(".", ",") : "",
  };
}

type Errors = Partial<Record<"approach" | "bio" | "topics" | "city" | "sessionMinutes" | "price", string>>;

/** Mirrors the API's checks (TherapistProfileRequest, TherapistInput.topics). */
export function validateDraft(d: ProfileDraft): Errors {
  const minutes = Number(d.sessionMinutes);
  const cents = priceToCents(d.price);
  const errors: Errors = {};
  if (!d.approach.trim()) errors.approach = copy.profileForm.approachError;
  if (!d.bio.trim()) errors.bio = copy.profileForm.bioError;
  if (d.topics.length < 1 || d.topics.length > 6) errors.topics = copy.profileForm.topicsError;
  if (!d.city.trim()) errors.city = copy.profileForm.cityError;
  if (!Number.isInteger(minutes) || minutes < 30 || minutes > 120) errors.sessionMinutes = copy.profileForm.minutesError;
  if (Number.isNaN(cents)) errors.price = copy.profileForm.priceError;
  return errors;
}

export function toBody(d: ProfileDraft): TherapistProfileBody {
  const cents = priceToCents(d.price);
  return {
    approach: d.approach.trim(),
    bio: d.bio.trim(),
    ...(d.faithNote.trim() ? { faithNote: d.faithNote.trim() } : {}),
    topics: d.topics,
    city: d.city.trim(),
    modality: d.modality,
    sessionMinutes: Number(d.sessionMinutes),
    ...(cents !== undefined ? { priceCents: cents } : {}),
  };
}

/** The professional profile fields, shared by the therapist sign-up and the panel's profile tab. */
export function ProfileFields({
  uid,
  draft,
  onChange,
  errors,
}: {
  uid: string;
  draft: ProfileDraft;
  onChange: (draft: ProfileDraft) => void;
  /** Only shown after a submit attempt; pass {} before that. */
  errors: Errors;
}) {
  const set = <K extends keyof ProfileDraft>(key: K) => (value: ProfileDraft[K]) => onChange({ ...draft, [key]: value });
  const toggle = (topic: Topic) =>
    onChange({
      ...draft,
      topics: draft.topics.includes(topic) ? draft.topics.filter((t) => t !== topic) : [...draft.topics, topic],
    });
  const topicsErrorId = `${uid}-topics-error`;

  return (
    <>
      <Field
        id={`${uid}-approach`}
        label={copy.profileForm.approachLabel}
        hint={copy.profileForm.approachHint}
        error={errors.approach ?? null}
        input={{ value: draft.approach, onChange: set("approach"), maxLength: 100 }}
      />
      <Field
        id={`${uid}-bio`}
        label={copy.profileForm.bioLabel}
        hint={copy.profileForm.bioHint}
        error={errors.bio ?? null}
        input={{ value: draft.bio, onChange: set("bio"), multiline: true, rows: 6, maxLength: 2000 }}
      />
      <Field
        id={`${uid}-faith`}
        label={copy.profileForm.faithLabel}
        hint={copy.profileForm.faithHint}
        error={null}
        input={{ value: draft.faithNote, onChange: set("faithNote"), multiline: true, rows: 3, maxLength: 500 }}
      />
      <fieldset className="field" aria-describedby={errors.topics ? topicsErrorId : undefined}>
        <legend className="field__label">{copy.profileForm.topicsLabel}</legend>
        <p className="field__hint">{copy.profileForm.topicsHint}</p>
        <div className="topic-picker">
          {TOPICS.map((topic) => (
            <label key={topic}>
              <input type="checkbox" checked={draft.topics.includes(topic)} onChange={() => toggle(topic)} />
              {copy.topics[topic]}
            </label>
          ))}
        </div>
        {errors.topics && (
          <p className="field__error" id={topicsErrorId}>
            {errors.topics}
          </p>
        )}
      </fieldset>
      <div className="grid-2">
        <Field
          id={`${uid}-city`}
          label={copy.profileForm.cityLabel}
          error={errors.city ?? null}
          input={{ value: draft.city, onChange: set("city"), autoComplete: "address-level2", maxLength: 100 }}
        />
        <Field
          id={`${uid}-modality`}
          label={copy.profileForm.modalityLabel}
          error={null}
          input={{
            value: draft.modality,
            onChange: (v) => set("modality")(v as Modality),
            options: MODALITIES.map((m) => ({ value: m, label: copy.modality[m] })),
          }}
        />
        <Field
          id={`${uid}-minutes`}
          label={copy.profileForm.minutesLabel}
          error={errors.sessionMinutes ?? null}
          input={{ value: draft.sessionMinutes, onChange: set("sessionMinutes"), inputMode: "numeric", maxLength: 3 }}
        />
        <Field
          id={`${uid}-price`}
          label={copy.profileForm.priceLabel}
          hint={copy.profileForm.priceHint}
          error={errors.price ?? null}
          input={{ value: draft.price, onChange: set("price"), inputMode: "decimal", maxLength: 12 }}
        />
      </div>
    </>
  );
}
