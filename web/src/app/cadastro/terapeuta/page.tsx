import type { Metadata } from "next";
import { TherapistSignUpForm } from "@/components/TherapistSignUpForm";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.therapistSignUp.pageTitle,
};

export default function TherapistSignUpPage() {
  return (
    <div className="wrap page">
      <TherapistSignUpForm />
    </div>
  );
}
