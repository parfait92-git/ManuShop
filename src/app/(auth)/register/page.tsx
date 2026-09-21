import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Créer ma boutique — ManuShop",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Créer votre boutique
      </h1>
      <RegisterForm />
    </div>
  );
}
