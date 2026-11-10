import Image from "next/image";
import emblem from "../../../public/brand/talita-cumi-emblema.jpg";

/**
 * The full watercolor emblem (woman looking up, the girl taking a hand inside the heart).
 * Use it large; below ~120 px the details turn to mush, so small places use <Wordmark /> instead.
 */
export function Emblem({ size, className, priority }: { size: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src={emblem}
      alt="Projeto Talita Cumi: Menina, levanta!"
      width={size}
      height={size}
      sizes={`(max-width: 56rem) 70vw, ${size}px`}
      className={className}
      priority={priority}
    />
  );
}

/**
 * Text lockup of the emblem's lettering: olive "TALITA" in the serif, "cumi" in rose script ending in a little heart.
 * Set in live type so it stays sharp at any size; `light` is for the slate footer.
 */
export function Wordmark({ size = 1, light = false }: { size?: number; light?: boolean }) {
  return (
    <span
      className="wordmark"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: `${0.12 * size}em`,
        fontSize: `${size * 1.5}rem`,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          color: light ? "var(--paper)" : "var(--olive)",
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          letterSpacing: "0.06em",
        }}
      >
        TALITA
      </span>
      <span
        className="script"
        style={{ color: light ? "var(--rose-soft)" : "var(--rose)", fontSize: "1.25em", display: "inline-flex", alignItems: "center" }}
      >
        cumi
        <svg
          viewBox="0 0 24 16"
          width="0.7em"
          height="0.47em"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          aria-hidden="true"
          style={{ marginLeft: "0.05em" }}
        >
          <path d="M0 13h8M16 13.5s-5-3-5-6.5a2.6 2.6 0 0 1 5-1 2.6 2.6 0 0 1 5 1c0 3.5-5 6.5-5 6.5z" />
        </svg>
      </span>
    </span>
  );
}

/**
 * The emblem's full stacked lettering, for the home page:
 * gold "PROJETO" between rules, olive "TALITA", rose "cumi", a small heart on a rule, gold "MENINA LEVANTA!".
 */
export function BrandLockup({ eyebrow, tagline }: { eyebrow: string; tagline: string }) {
  // Spans only, so the lockup can sit inside the page's <h1>.
  return (
    <span style={{ display: "grid", justifyItems: "start", gap: "0.4rem" }}>
      <span className="eyebrow eyebrow--gold eyebrow--ruled">{eyebrow}</span>
      <span
        style={{
          color: "var(--olive)",
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(3rem, 8vw, 4.75rem)",
          letterSpacing: "0.06em",
          lineHeight: 0.9,
        }}
      >
        TALITA
      </span>
      <span
        className="script"
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginTop: "-0.35em",
          marginLeft: "0.6em",
          fontSize: "clamp(3.25rem, 8.5vw, 5rem)",
          lineHeight: 1,
        }}
      >
        cumi
        <svg viewBox="0 0 24 16" width="0.55em" height="0.37em" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" aria-hidden="true">
          <path d="M0 13h8M16 13.5s-5-3-5-6.5a2.6 2.6 0 0 1 5-1 2.6 2.6 0 0 1 5 1c0 3.5-5 6.5-5 6.5z" />
        </svg>
      </span>
      <span className="eyebrow eyebrow--gold eyebrow--ruled" style={{ marginTop: "0.25rem" }}>
        {tagline}
      </span>
    </span>
  );
}
