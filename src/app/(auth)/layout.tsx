import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        ManuShop
      </Link>
      {children}
    </div>
  );
}
