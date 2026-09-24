import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "@/components/providers/AuthProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export const metadata: Metadata = {
  title: "ManuShop — Boutique numérique multicanal",
  description:
    "ManuShop digitalise votre boutique : catalogue, stock, facturation et publication multicanal (WhatsApp, Facebook, Instagram, TikTok).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased" data-scroll-behavior="smooth">
      {/* suppressHydrationWarning : certaines extensions navigateur (Grammarly,
      gestionnaires de mots de passe...) injectent des attributs sur <body>
      avant l'hydratation React — un faux positif inoffensif, pas un bug de
      l'app. Ça ne masque que les avertissements sur CET élément, pas ceux
      sur ses enfants. */}
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
        <InstallPrompt />
      </body>
    </html>
  );
}
