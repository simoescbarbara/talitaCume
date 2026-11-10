import type { Metadata } from "next";
import { AdminScreen } from "@/components/AdminScreen";
import { copy } from "@/lib/copy";

// Not linked from the site; reached by typing /admin. The API's admin token is what protects it.
export const metadata: Metadata = {
  title: copy.admin.pageTitle,
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="wrap page">
      <AdminScreen />
    </div>
  );
}
