import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/brand/Icon";
import { NextSlots } from "@/components/NextSlots";
import { copy } from "@/lib/copy";
import { formatPrice } from "@/lib/dates";
import { getTherapist } from "@/lib/server-api";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const therapist = await getTherapist(id);
  if (!therapist) return { title: copy.notFound.title };
  return {
    title: `${therapist.name}, ${therapist.approach}`,
    description: copy.profile.description(therapist.name, therapist.approach),
  };
}

export default async function TherapistPage({ params }: Props) {
  const { id } = await params;
  const therapist = await getTherapist(id);
  if (!therapist) notFound();

  const bookHref = `/terapeutas/${therapist.id}/agendar`;

  return (
    <div className="wrap page">
      <Link className="back" href="/#terapeutas">
        <Icon name="back" size={18} />
        {copy.profile.back}
      </Link>
      <div className="profile">
        <div>
          <h1 className="page-title">{therapist.name}</h1>
          <p className="page-sub">{therapist.approach}</p>
          <p className="profile__badges">
            <span className="profile__verified">
              <Icon name="shield" size={20} />
              {copy.profile.crp(therapist.crp)} · {copy.profile.verified}
            </span>
            <span>
              <Icon name={therapist.modality === "IN_PERSON" ? "pin" : "video"} size={20} />
              {copy.modality[therapist.modality]}
            </span>
            <span>
              <Icon name="pin" size={20} />
              {therapist.city}
            </span>
            <span>
              <Icon name="clock" size={20} />
              {copy.profile.session(therapist.sessionMinutes)}
            </span>
          </p>

          <div className="profile__block">
            <p className="profile__bio">{therapist.bio}</p>
          </div>

          {therapist.faithNote && (
            <div className="profile__block">
              <h2>{copy.profile.faithTitle}</h2>
              <p className="profile__faith">{therapist.faithNote}</p>
            </div>
          )}

          <div className="profile__block">
            <h2>{copy.profile.topicsTitle}</h2>
            <ul className="chips">
              {therapist.topics.map((topic) => (
                <li className="chip" key={topic}>
                  {copy.topics[topic]}
                </li>
              ))}
            </ul>
          </div>

          <div className="profile__block">
            <p>
              {therapist.priceCents != null
                ? copy.profile.price(formatPrice(therapist.priceCents))
                : copy.profile.priceOnRequest}
            </p>
          </div>

          <div className="profile__actions">
            <Link className="button" href={bookHref}>
              <Icon name="heart" size={20} />
              {copy.profile.book}
            </Link>
          </div>
        </div>
        <section className="panel" aria-labelledby="next-title">
          <h2 className="section-title" id="next-title">
            {copy.profile.nextTitle}
          </h2>
          <NextSlots therapistId={therapist.id} />
          <p className="agenda-foot">
            <Link className="button button--quiet" href={bookHref}>
              {copy.profile.fullAgenda}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
