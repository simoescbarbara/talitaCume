"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { ClientApiError, registerClient } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import { EMAIL, PASSWORD_MIN, digits, isPasswordTooLong, isPhone } from "@/lib/validation";
import { useAccount } from "./AccountProvider";
import { Field } from "./Field";

export type PersonDraft = { name: string; email: string; phone: string; password: string };

export const emptyPerson: PersonDraft = { name: "", email: "", phone: "", password: "" };

/** The checks shared by both sign-ups. `takenEmail` is the lowercased e-mail the API last answered 409 for. */
export function personErrors(p: PersonDraft, takenEmail: string | null) {
  return {
    name: p.name.trim() ? null : copy.signUp.nameError,
    email: !EMAIL.test(p.email.trim())
      ? copy.signUp.emailError
      : takenEmail === p.email.trim().toLowerCase()
        ? copy.signUp.emailTaken
        : null,
    phone: isPhone(p.phone) ? null : copy.signUp.phoneError,
    password:
      p.password.length < PASSWORD_MIN
        ? copy.signUp.passwordError
        : isPasswordTooLong(p.password)
          ? copy.signUp.passwordTooLong
          : null,
  };
}

export const personBody = (p: PersonDraft) => ({
  name: p.name.trim(),
  email: p.email.trim(),
  phone: digits(p.phone),
  password: p.password,
});

/** Name, e-mail, phone and password: the person part of both sign-ups. */
export function PersonFields({
  uid,
  person,
  onChange,
  errors,
  nameLabel = copy.signUp.nameLabel,
}: {
  uid: string;
  person: PersonDraft;
  onChange: (person: PersonDraft) => void;
  errors: ReturnType<typeof personErrors> | null;
  nameLabel?: string;
}) {
  const set = (key: keyof PersonDraft) => (value: string) => onChange({ ...person, [key]: value });
  return (
    <>
      <Field
        id={`${uid}-name`}
        label={nameLabel}
        error={errors?.name ?? null}
        input={{ value: person.name, onChange: set("name"), autoComplete: "name" }}
      />
      <Field
        id={`${uid}-email`}
        label={copy.signUp.emailLabel}
        error={errors?.email ?? null}
        input={{ value: person.email, onChange: set("email"), autoComplete: "email", type: "email", inputMode: "email" }}
      />
      <Field
        id={`${uid}-phone`}
        label={copy.signUp.phoneLabel}
        hint={copy.signUp.phoneHint}
        error={errors?.phone ?? null}
        input={{ value: person.phone, onChange: set("phone"), autoComplete: "tel", type: "tel", inputMode: "tel", maxLength: 20 }}
      />
      <Field
        id={`${uid}-password`}
        label={copy.signUp.passwordLabel}
        hint={copy.signUp.passwordHint}
        error={errors?.password ?? null}
        input={{ value: person.password, onChange: set("password"), autoComplete: "new-password", type: "password", maxLength: 72 }}
      />
    </>
  );
}

/** One short step. The API signs her in, and she goes back to where she was (usually a booking). */
export function SignUpForm({ next }: { next: string }) {
  const uid = useId();
  const router = useRouter();
  const { signedIn } = useAccount();
  const [person, setPerson] = useState(emptyPerson);
  const [emailTaken, setEmailTaken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = personErrors(person, emailTaken);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (Object.values(errors).some(Boolean)) return;

    setSaving(true);
    try {
      signedIn(await registerClient(personBody(person)));
      router.replace(next);
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 409) {
        setEmailTaken(person.email.trim().toLowerCase());
      } else if (error instanceof ClientApiError && error.status === 400) {
        setFormError(copy.signUp.invalid);
      } else {
        setFormError(copy.signUp.genericError);
      }
      setSaving(false);
    }
  }

  return (
    <div className="auth">
      <h1 className="page-title">{copy.signUp.title}</h1>
      <p className="page-sub">{copy.signUp.lead}</p>
      <div className="panel auth__panel">
        <form noValidate onSubmit={onSubmit}>
          <PersonFields uid={uid} person={person} onChange={setPerson} errors={submitted ? errors : null} />
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="auth__actions">
            <button className="button button--block" type="submit" disabled={saving}>
              {saving ? copy.signUp.saving : copy.signUp.submit}
            </button>
          </div>
        </form>
      </div>
      <p className="auth__switch">
        {copy.signUp.haveAccount}{" "}
        <Link className="link-button" href={next === "/" ? "/entrar" : `/entrar?next=${encodeURIComponent(next)}`}>
          {copy.signUp.goLogin}
        </Link>
      </p>
      <p className="auth__switch">
        <Link className="link-button" href="/cadastro/terapeuta">
          {copy.signUp.therapistLink}
        </Link>
      </p>
    </div>
  );
}
