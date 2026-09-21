import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-svh flex-col">
        <DashboardNav />
        <main className="flex-1 px-4 py-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
