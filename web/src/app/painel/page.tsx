import type { Metadata } from "next";
import { TherapistPanel } from "@/components/TherapistPanel";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.panel.pageTitle,
  robots: { index: false },
};

export default function PanelPage() {
  return (
    <div className="wrap page">
      <TherapistPanel />
    </div>
  );
}
