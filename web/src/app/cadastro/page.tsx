import type { Metadata } from "next";
import { SignUpForm } from "@/components/SignUpForm";
import { copy } from "@/lib/copy";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = {
  title: copy.signUp.pageTitle,
  robots: { index: false },
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignUpPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="wrap page">
      <SignUpForm next={safeNext(next, "/#terapeutas")} />
    </div>
  );
}
