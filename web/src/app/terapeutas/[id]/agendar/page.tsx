import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/BookingFlow";
import { Icon } from "@/components/brand/Icon";
import { copy } from "@/lib/copy";
import { nextDays } from "@/lib/dates";
import { getTherapist } from "@/lib/server-api";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; slot?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const therapist = await getTherapist(id);
  return {
    title: therapist ? copy.booking.title(therapist.name) : copy.notFound.title,
    robots: { index: false }, // Booking pages are per-visit; the profile is the page to index.
  };
}

export default async function BookPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { date, slot } = await searchParams;
  const therapist = await getTherapist(id);
  if (!therapist) notFound();

  return (
    <div className="wrap page">
      <Link className="back" href={`/terapeutas/${therapist.id}`}>
        <Icon name="back" size={18} />
        {copy.booking.back}
      </Link>
      {/* Days are computed here, on the server, so server and client agree on "today". */}
      <BookingFlow therapist={therapist} days={nextDays(14)} initialDate={date} initialSlot={slot} />
    </div>
  );
}
