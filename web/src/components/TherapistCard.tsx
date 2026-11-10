import Link from "next/link";
import { copy } from "@/lib/copy";
import type { Therapist } from "@/lib/types";
import { Icon } from "./brand/Icon";

export function TherapistCard({ therapist }: { therapist: Therapist }) {
  return (
    <li className="result">
      <Link className="result__name" href={`/terapeutas/${therapist.id}`}>
        {therapist.name}
      </Link>
      <p>{therapist.approach}</p>
      <p className="result__meta">
        <span>
          <Icon name={therapist.modality === "IN_PERSON" ? "pin" : "video"} size={18} />
          {copy.modality[therapist.modality]}
        </span>
        <span>
          <Icon name="pin" size={18} />
          {therapist.city}
        </span>
      </p>
      <ul className="chips" aria-label={copy.profile.topicsTitle}>
        {therapist.topics.map((topic) => (
          <li className="chip" key={topic}>
            {copy.topics[topic]}
          </li>
        ))}
      </ul>
      <span className="result__cta" aria-hidden="true">
        {copy.search.seeProfile}
        <Icon name="arrow" size={18} />
      </span>
    </li>
  );
}
