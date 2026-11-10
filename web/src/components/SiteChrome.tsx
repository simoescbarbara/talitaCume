import Link from "next/link";
import { copy } from "@/lib/copy";
import { AccountMenu } from "./AccountMenu";
import { Wordmark } from "./brand/Logo";
import { CrisisNotice } from "./CrisisNotice";

/** Crisis lines on top, then the light masthead with the wordmark. Shown on every page. */
export function SiteHeader() {
  return (
    <header>
      <CrisisNotice />
      <div className="masthead">
        <div className="wrap masthead__inner">
          <Link className="masthead__brand" href="/" aria-label={copy.home}>
            <Wordmark size={0.95} />
          </Link>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

/** Slate "dusk" footer, edged with a line of dawn, carrying the verse the project is named after. */
export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <div>
          <Wordmark size={1.1} light />
          <p className="eyebrow" style={{ color: "var(--gold-soft)", marginTop: "0.75rem" }}>
            {copy.tagline}
          </p>
        </div>
        <blockquote className="footer__verse" style={{ margin: 0 }}>
          {copy.verse}
          <cite className="footer__ref">{copy.verseRef}</cite>
        </blockquote>
      </div>
    </footer>
  );
}
