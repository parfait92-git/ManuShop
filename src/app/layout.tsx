import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

import { TourProvider } from "@/components/onboarding/TourProvider";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { PLATFORM_DESCRIPTION, PLATFORM_KEYWORDS, PLATFORM_TITLE } from "@/lib/platformSeo";
import { getPublicSiteUrl } from "@/server/seo/publicData";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export async function generateMetadata(): Promise<Metadata> {
  return {
    // Base des liens absolus (aperçus de partage, canonique) des pages qui
    // déclarent des chemins relatifs — boutiques et articles notamment.
    // Domaine réglé par le Super Admin, sinon celui du déploiement.
    metadataBase: new URL(await getPublicSiteUrl()),
    ...BASE_METADATA,
  };
}

const BASE_METADATA: Metadata = {
  title: {
    default: PLATFORM_TITLE,
    // Pages de la plateforme ("Connexion | ManuShop"). Les boutiques et
    // leurs articles utilisent un titre `absolute`, sans ManuShop : elles
    // sont présentées comme le site de leur commerçant (`src/lib/seo.ts`).
    template: "%s | ManuShop",
  },
  description: PLATFORM_DESCRIPTION,
  keywords: PLATFORM_KEYWORDS,
  applicationName: "ManuShop",
  // Déclarées ici plutôt que par fichiers `app/favicon.ico`/`apple-icon.png`
  // (que Next ajoute à TOUTES les pages, sans possibilité de les retirer) :
  // les pages d'une boutique les remplacent par le logo de la boutique, qui
  // y est présentée comme le site de son commerçant (voir `src/lib/seo.ts`).
  icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
  openGraph: {
    type: "website",
    siteName: "ManuShop",
    locale: "fr_FR",
    title: PLATFORM_TITLE,
    description: PLATFORM_DESCRIPTION,
  },
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
        <I18nProvider>
          <CurrencyProvider>
            <AuthProvider>
              <TourProvider>{children}</TourProvider>
            </AuthProvider>
          </CurrencyProvider>
        </I18nProvider>
        <InstallPrompt />
        {/* `sonner` était une dépendance installée mais jamais montée (BNF-37
        demande des toasts pour chaque action) — un seul <Toaster/> global
        plutôt qu'un par page. */}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
