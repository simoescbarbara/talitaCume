import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { copy } from "@/lib/copy";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = {
  title: copy.login.pageTitle,
  robots: { index: false },
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="wrap page">
      <LoginForm next={safeNext(next)} />
    </div>
  );
}
