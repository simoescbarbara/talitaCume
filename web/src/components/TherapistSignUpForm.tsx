"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ClientApiError, registerTherapist } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import { isCrp } from "@/lib/validation";
import { useAccount } from "./AccountProvider";
import { Field } from "./Field";
import { ProfileFields, emptyDraft, toBody, validateDraft } from "./ProfileFields";
import { PersonFields, emptyPerson, personBody, personErrors } from "./SignUpForm";

/** Person, CRP and profile in one form. The profile stays hidden from search until the CRP is verified. */
export function TherapistSignUpForm() {
  const uid = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { signedIn } = useAccount();
  const [person, setPerson] = useState(emptyPerson);
  const [crp, setCrp] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [ethics, setEthics] = useState(false);
  const [emailTaken, setEmailTaken] = useState<string | null>(null);
  const [crpTaken, setCrpTaken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) headingRef.current?.focus();
  }, [done]);

  const pErrors = personErrors(person, emailTaken);
  const crpError = !isCrp(crp) ? copy.therapistSignUp.crpError : crpTaken === crp.trim() ? copy.therapistSignUp.crpTaken : null;
  const profileErrors = validateDraft(draft);
  const ethicsError = ethics ? null : copy.therapistSignUp.ethicsError;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (Object.values(pErrors).some(Boolean) || crpError || Object.keys(profileErrors).length || ethicsError) return;

    setSaving(true);
    try {
      const result = await registerTherapist({ account: personBody(person), crp: crp.trim(), profile: toBody(draft) });
      signedIn(result.account);
      setDone(true);
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 409) {
        // The API names which one is taken in its problem detail.
        if (error.message.includes("CRP")) setCrpTaken(crp.trim());
        else setEmailTaken(person.email.trim().toLowerCase());
      } else if (error instanceof ClientApiError && error.status === 400) {
        setFormError(copy.signUp.invalid);
      } else {
        setFormError(copy.signUp.genericError);
      }
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="confirm">
        <h1 className="page-title confirm__title" ref={headingRef} tabIndex={-1}>
          {copy.therapistSignUp.doneTitle}
        </h1>
        <p className="page-sub">{copy.therapistSignUp.doneBody}</p>
        <div className="confirm__actions">
          <Link className="button" href="/painel">
            {copy.therapistSignUp.goPanel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth auth--wide">
      <h1 className="page-title">{copy.therapistSignUp.title}</h1>
      <p className="page-sub">{copy.therapistSignUp.lead}</p>
      <div className="panel auth__panel">
        <form noValidate onSubmit={onSubmit}>
          <fieldset className="auth__section">
            <legend className="auth__legend">{copy.therapistSignUp.personTitle}</legend>
            <PersonFields
              uid={uid}
              person={person}
              onChange={setPerson}
              errors={submitted ? pErrors : null}
              nameLabel={copy.therapistSignUp.nameLabel}
            />
            <Field
              id={`${uid}-crp`}
              label={copy.therapistSignUp.crpLabel}
              hint={copy.therapistSignUp.crpHint}
              error={submitted ? crpError : null}
              input={{ value: crp, onChange: setCrp, maxLength: 16, autoComplete: "off" }}
            />
          </fieldset>
          <fieldset className="auth__section">
            <legend className="auth__legend">{copy.profileForm.title}</legend>
            <ProfileFields uid={uid} draft={draft} onChange={setDraft} errors={submitted ? profileErrors : {}} />
          </fieldset>
          <div className="auth__section">
            <label className="check">
              <input
                type="checkbox"
                checked={ethics}
                onChange={(e) => setEthics(e.target.checked)}
                aria-invalid={submitted && ethicsError ? true : undefined}
              />
              <span>{copy.therapistSignUp.ethics}</span>
            </label>
            {submitted && ethicsError && <p className="field__error">{ethicsError}</p>}
          </div>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="auth__actions">
            <button className="button button--block" type="submit" disabled={saving}>
              {saving ? copy.signUp.saving : copy.therapistSignUp.submit}
            </button>
          </div>
        </form>
      </div>
      <p className="auth__switch">
        {copy.signUp.haveAccount}{" "}
        <Link className="link-button" href="/entrar?next=%2Fpainel">
          {copy.signUp.goLogin}
        </Link>
      </p>
    </div>
  );
}
