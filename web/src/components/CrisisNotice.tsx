import { copy } from "@/lib/copy";

/**
 * Always visible, on every page. A booking platform must never be the only door for someone in crisis:
 * CVV (188) and SAMU (192) answer now; Ligue 180 is the national line for women facing violence.
 */
export function CrisisNotice() {
  return (
    <aside className="crisis" aria-label={copy.crisis.title}>
      <div className="wrap crisis__inner">
        <span className="crisis__title">{copy.crisis.title}</span>
        <ul className="crisis__lines">
          <li>
            <a href="tel:188">{copy.crisis.cvv}</a> <span className="crisis__note">({copy.crisis.cvvNote})</span>
          </li>
          <li>
            <a href="tel:192">{copy.crisis.samu}</a>
          </li>
          <li>
            <a href="tel:180">{copy.crisis.violence}</a> <span className="crisis__note">({copy.crisis.violenceNote})</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}
