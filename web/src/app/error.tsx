"use client";

import { copy } from "@/lib/copy";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap page">
      <h1 className="page-title">{copy.error.title}</h1>
      <p className="status" role="alert">
        {copy.error.body}
      </p>
      <p className="profile__actions">
        <button className="button" type="button" onClick={reset}>
          {copy.error.retry}
        </button>
      </p>
    </div>
  );
}
