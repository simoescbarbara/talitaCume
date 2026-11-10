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
 * Text lockup of the emblem's lettering: "TALITA" in the serif, "cumi" in gold script ending in a little heart.
 * Set in live type so it stays sharp at any size and inherits the page's colours.
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
          fontWeight: 500,
          letterSpacing: "0.08em",
        }}
      >
        TALITA
      </span>
      <span
        className="script"
        style={{ color: light ? "var(--gold-soft)" : "var(--gold)", fontSize: "1.25em", display: "inline-flex", alignItems: "center" }}
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
