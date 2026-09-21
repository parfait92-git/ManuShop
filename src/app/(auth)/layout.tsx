import { ArrowLeft, Store } from "lucide-react";
import Link from "next/link";

import { PageBackground } from "@/components/sections/PageBackground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative flex min-h-svh flex-col overflow-hidden bg-slate-950">
      <PageBackground />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-white"
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-white/10"
          >
            <Store className="size-4 text-cyan-300" />
          </span>
          Manu <span className="text-cyan-300">Shop</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Retour à l&apos;accueil
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        {children}
      </main>
    </div>
  );
}
