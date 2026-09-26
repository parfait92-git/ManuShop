"use client";

import { AccountSettingsForm } from "@/components/account/AccountSettingsForm";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AccountSettingsForm />
      </div>
    </ProtectedRoute>
  );
}
