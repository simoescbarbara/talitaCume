"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { ClientApiError, login } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import { useAccount } from "./AccountProvider";
import { Field } from "./Field";

/** E-mail and password. Goes to `next` (already checked to be a same-site path); therapists land on their panel. */
export function LoginForm({ next }: { next: string }) {
  const uid = useId();
  const router = useRouter();
  const { signedIn } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailError = email.trim() ? null : copy.login.emailError;
  const passwordError = password ? null : copy.login.passwordError;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (emailError || passwordError) return;

    setSaving(true);
    try {
      const account = await login({ email: email.trim(), password });
      signedIn(account);
      router.replace(next === "/" && account.role === "THERAPIST" ? "/painel" : next);
    } catch (error) {
      setFormError(error instanceof ClientApiError && error.status === 401 ? copy.login.wrong : copy.login.genericError);
      setSaving(false);
    }
  }

  return (
    <div className="auth">
      <h1 className="page-title">{copy.login.title}</h1>
      <div className="panel auth__panel">
        <form noValidate onSubmit={onSubmit}>
          <Field
            id={`${uid}-email`}
            label={copy.login.emailLabel}
            error={submitted ? emailError : null}
            input={{ value: email, onChange: setEmail, autoComplete: "email", type: "email", inputMode: "email" }}
          />
          <Field
            id={`${uid}-password`}
            label={copy.login.passwordLabel}
            error={submitted ? passwordError : null}
            input={{ value: password, onChange: setPassword, autoComplete: "current-password", type: "password", maxLength: 72 }}
          />
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="auth__actions">
            <button className="button button--block" type="submit" disabled={saving}>
              {saving ? copy.login.saving : copy.login.submit}
            </button>
          </div>
        </form>
      </div>
      <p className="auth__switch">
        {copy.login.noAccount}{" "}
        <Link className="link-button" href={next === "/" ? "/cadastro" : `/cadastro?next=${encodeURIComponent(next)}`}>
          {copy.login.goSignUp}
        </Link>
      </p>
    </div>
  );
}
