"use client";

import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { ClientApiError, fetchPendingTherapists, verifyTherapist } from "@/lib/client-api";
import { copy } from "@/lib/copy";
import type { Therapist } from "@/lib/types";
import { Icon } from "./brand/Icon";
import { Field } from "./Field";

// sessionStorage, not localStorage: the key lives only in this tab and is gone when it closes.
const TOKEN_KEY = "talitacumi_admin_token";
const REGISTRY_URL = "https://cadastro.cfp.org.br/";

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: the key just won't survive a reload.
  }
}

type State =
  | { status: "locked"; error: string | null }
  | { status: "loading"; token: string }
  | { status: "error"; token: string }
  | { status: "ready"; token: string; pending: Therapist[] };

/** CRP verification queue. Protected by the API's shared admin token (X-Admin-Token), not by a user account. */
export function AdminScreen() {
  const [state, setState] = useState<State>({ status: "locked", error: null });
  const [approved, setApproved] = useState<string | null>(null);

  async function load(token: string) {
    setState({ status: "loading", token });
    try {
      const pending = await fetchPendingTherapists(token);
      writeToken(token);
      setState({ status: "ready", token, pending });
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 403) {
        writeToken(null);
        setState({ status: "locked", error: copy.admin.wrongToken });
      } else {
        setState({ status: "error", token });
      }
    }
  }

  useEffect(() => {
    const saved = readToken();
    if (saved) void load(saved);
  }, []);

  function leave() {
    writeToken(null);
    setApproved(null);
    setState({ status: "locked", error: null });
  }

  return (
    <div className="admin">
      <p className="eyebrow eyebrow--gold">{copy.admin.pageTitle}</p>
      <h1 className="page-title">{copy.admin.title}</h1>
      <p className="page-sub">{copy.admin.lead}</p>
      <p style={{ marginTop: "0.75rem" }}>
        <a className="link-button" href={REGISTRY_URL} target="_blank" rel="noreferrer noopener">
          {copy.admin.registry}
        </a>
      </p>

      {state.status === "locked" ? (
        <TokenForm error={state.error} onSubmit={load} />
      ) : state.status === "loading" ? (
        <p className="status" role="status">
          {copy.admin.checking}
        </p>
      ) : state.status === "error" ? (
        <div className="status status--error" role="alert">
          <p>{copy.admin.loadError}</p>
          <button className="link-button" type="button" onClick={() => load(state.token)}>
            {copy.error.retry}
          </button>
        </div>
      ) : (
        <>
          <div className="panel-actions">
            <button className="button button--quiet" type="button" onClick={() => load(state.token)}>
              {copy.admin.refresh}
            </button>
            <button className="button button--quiet" type="button" onClick={leave}>
              {copy.admin.leave}
            </button>
          </div>
          <div aria-live="polite">{approved && <p className="form-ok">{copy.admin.approved(approved)}</p>}</div>
          <h2 className="section-title" style={{ marginTop: "2rem" }}>
            {state.pending.length ? copy.admin.pendingCount(state.pending.length) : copy.admin.empty}
          </h2>
          <ul className="sessions">
            {state.pending.map((t) => (
              <PendingItem
                key={t.id}
                therapist={t}
                token={state.token}
                onApproved={() => {
                  setApproved(t.name);
                  setState({ ...state, pending: state.pending.filter((p) => p.id !== t.id) });
                }}
                onForbidden={() => {
                  writeToken(null);
                  setState({ status: "locked", error: copy.admin.wrongToken });
                }}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function TokenForm({ error, onSubmit }: { error: string | null; onSubmit: (token: string) => void }) {
  const uid = useId();
  const [token, setToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const tokenError = token.trim() ? null : copy.admin.tokenError;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!tokenError) onSubmit(token.trim());
  }

  return (
    <div className="panel auth__panel" style={{ maxWidth: "30rem" }}>
      <form noValidate onSubmit={submit}>
        <Field
          id={`${uid}-token`}
          label={copy.admin.tokenLabel}
          hint={copy.admin.tokenHint}
          error={submitted ? tokenError : null}
          input={{ value: token, onChange: setToken, type: "password", autoComplete: "off", maxLength: 200 }}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="auth__actions">
          <button className="button button--block" type="submit">
            {copy.admin.enter}
          </button>
        </div>
      </form>
    </div>
  );
}

function PendingItem({
  therapist: t,
  token,
  onApproved,
  onForbidden,
}: {
  therapist: Therapist;
  token: string;
  onApproved: () => void;
  onForbidden: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function approve() {
    setSaving(true);
    setError(false);
    try {
      await verifyTherapist(t.id, token);
      onApproved();
    } catch (e) {
      if (e instanceof ClientApiError && e.status === 403) onForbidden();
      else {
        setError(true);
        setSaving(false);
      }
    }
  }

  return (
    <li className="session">
      <div className="session__head">
        <p className="session__when">{t.name}</p>
        <span className="session__tag">
          {copy.admin.crp} {t.crp}
        </span>
      </div>
      <dl className="session__details admin__facts">
        <div>
          <dt>{copy.admin.approach}</dt>
          <dd>{t.approach}</dd>
        </div>
        <div>
          <dt>{copy.admin.city}</dt>
          <dd>
            {t.city} · {copy.modality[t.modality]}
          </dd>
        </div>
        <div>
          <dt>{copy.admin.topics}</dt>
          <dd>{t.topics.map((topic) => copy.topics[topic]).join(", ")}</dd>
        </div>
        <div>
          <dt>{copy.admin.bio}</dt>
          <dd>{t.bio}</dd>
        </div>
        {t.faithNote && (
          <div>
            <dt>{copy.admin.faith}</dt>
            <dd>{t.faithNote}</dd>
          </div>
        )}
      </dl>
      <div className="session__actions">
        {confirming ? (
          <>
            <span>{copy.admin.approveSure(t.name, t.crp)}</span>
            <button className="button" type="button" onClick={approve} disabled={saving}>
              <Icon name="shield" size={20} />
              {saving ? copy.admin.approving : copy.admin.approveYes}
            </button>
            <button className="button button--quiet" type="button" onClick={() => setConfirming(false)} disabled={saving}>
              {copy.admin.approveNo}
            </button>
          </>
        ) : (
          <button className="button" type="button" onClick={() => setConfirming(true)}>
            <Icon name="shield" size={20} />
            {copy.admin.approve}
          </button>
        )}
        {error && (
          <p className="field__error" role="alert">
            {copy.admin.approveError}
          </p>
        )}
      </div>
    </li>
  );
}
