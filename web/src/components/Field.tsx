"use client";

export type FieldInput = {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  type?: string;
  inputMode?: "email" | "tel" | "numeric" | "decimal";
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
  /** Renders a <select> with these options instead of a text input. */
  options?: { value: string; label: string }[];
};

/** Labelled input, textarea or select with an optional hint and an error wired to aria-describedby. */
export function Field({
  id,
  label,
  hint,
  error,
  input,
}: {
  id: string;
  label: string;
  hint?: string;
  error: string | null;
  input: FieldInput;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const common = {
    className: "field__input",
    id,
    value: input.value,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy,
  };
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {input.options ? (
        <select {...common} onChange={(e) => input.onChange(e.target.value)}>
          {input.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : input.multiline ? (
        <textarea
          {...common}
          rows={input.rows ?? 4}
          maxLength={input.maxLength ?? 1000}
          onChange={(e) => input.onChange(e.target.value)}
        />
      ) : (
        <input
          {...common}
          type={input.type}
          inputMode={input.inputMode}
          autoComplete={input.autoComplete}
          maxLength={input.maxLength ?? 200}
          onChange={(e) => input.onChange(e.target.value)}
        />
      )}
      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
