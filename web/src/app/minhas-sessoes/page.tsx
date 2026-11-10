import type { Metadata } from "next";
import { SessionsScreen } from "@/components/SessionsScreen";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.sessions.pageTitle,
  robots: { index: false },
};

export default function SessionsPage() {
  return (
    <div className="wrap page">
      <SessionsScreen />
    </div>
  );
}
