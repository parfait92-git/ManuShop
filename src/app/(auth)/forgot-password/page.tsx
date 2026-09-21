import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — ManuShop",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Mot de passe oublié
      </h1>
      <ForgotPasswordForm />
    </div>
  );
}
