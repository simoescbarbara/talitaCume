import Link from "next/link";
import { Emblem, Wordmark } from "@/components/brand/Logo";
import { Icon } from "@/components/brand/Icon";
import { TherapistCard } from "@/components/TherapistCard";
import { copy } from "@/lib/copy";
import { searchTherapists } from "@/lib/server-api";
import { MODALITIES, TOPICS } from "@/lib/types";
import type { Modality, Therapist, Topic } from "@/lib/types";

type Props = {
  searchParams: Promise<{ topic?: string | string[]; modality?: string | string[] }>;
};

const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  // Ignore anything that isn't a known value, so a hand-edited URL can't make the API answer 400.
  const topic = TOPICS.find((t) => t === first(params.topic)) as Topic | undefined;
  const modality = MODALITIES.find((m) => m === first(params.modality)) as Modality | undefined;
  const filtered = topic !== undefined || modality !== undefined;

  let therapists: Therapist[] = [];
  let failed = false;
  try {
    therapists = await searchTherapists({ topic, modality });
  } catch {
    failed = true;
  }

  return (
    <>
      <section className="hero">
        <div className="wrap hero__inner">
          <div>
            <p className="eyebrow">{copy.search.eyebrow}</p>
            <h1 style={{ margin: "0.5rem 0 0" }}>
              <Wordmark size={2.1} />
            </h1>
            <p className="eyebrow" style={{ marginTop: "0.75rem", color: "var(--gold-text)" }}>
              {copy.tagline}
            </p>
            <p className="hero__title">{copy.search.title}</p>
            <p className="hero__lead">{copy.search.lead}</p>

            {/* A plain GET form: works before any JavaScript loads. */}
            <form className="search" action="/" method="get" role="search">
              <div className="field">
                <label className="field__label" htmlFor="topic">
                  {copy.search.topicLabel}
                </label>
                <select className="field__input" id="topic" name="topic" defaultValue={topic ?? ""}>
                  <option value="">{copy.search.topicAny}</option>
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {copy.topics[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="modality">
                  {copy.search.modalityLabel}
                </label>
                <select className="field__input" id="modality" name="modality" defaultValue={modality ?? ""}>
                  <option value="">{copy.search.modalityAny}</option>
                  <option value="ONLINE">{copy.modality.ONLINE}</option>
                  <option value="IN_PERSON">{copy.modality.IN_PERSON}</option>
                </select>
              </div>
              <button className="button" type="submit">
                <Icon name="search" size={20} />
                {copy.search.submit}
              </button>
            </form>
          </div>
          <div className="hero__art">
            <Emblem size={416} className="hero__emblem" priority />
          </div>
        </div>
      </section>

      <section className="results-section" aria-labelledby="results-title" id="terapeutas">
        <div className="wrap">
          {failed ? (
            <p className="status status--error" role="alert">
              {copy.search.error}
            </p>
          ) : therapists.length === 0 ? (
            <p className="status">{filtered ? copy.search.emptyFiltered : copy.search.emptyAll}</p>
          ) : (
            <>
              <div className="results-head">
                <h2 className="section-title" id="results-title">
                  {filtered ? copy.search.resultsTitle : copy.search.allTitle}
                </h2>
                <p className="results-count">{copy.search.count(therapists.length)}</p>
              </div>
              <ol className="results">
                {therapists.map((therapist) => (
                  <TherapistCard key={therapist.id} therapist={therapist} />
                ))}
              </ol>
            </>
          )}
        </div>
      </section>

      <section className="how" aria-labelledby="how-title">
        <div className="wrap">
          <h2 className="section-title" id="how-title">
            {copy.how.title}
          </h2>
          <ol className="how__steps">
            {copy.how.steps.map((step) => (
              <li className="how__step" key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>

          <p className="rule" style={{ marginTop: "clamp(2.5rem, 6vw, 4rem)" }} aria-hidden="true">
            <Icon name="heart" size={20} />
          </p>

          <div className="how__faith">
            <div>
              <h2>{copy.how.faithTitle}</h2>
              <p>{copy.how.faithBody}</p>
            </div>
            <div className="panel">
              <h2>{copy.how.forTherapists}</h2>
              <p>{copy.how.forTherapistsBody}</p>
              <Link className="button button--quiet" href="/cadastro/terapeuta">
                <Icon name="leaf" size={20} />
                {copy.how.forTherapistsAction}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
