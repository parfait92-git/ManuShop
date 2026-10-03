import {
  BarChart3,
  Boxes,
  MapPin,
  Receipt,
  Share2,
  Store,
  Tag,
  WifiOff,
} from "lucide-react";

import { PageBackground } from "@/components/sections/PageBackground";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { ContactSuperAdminCta } from "@/components/storefront/ContactSuperAdminCta";
import {
  HeroAccent,
  HeroSection,
} from "@/components/sections/HeroSection";
import {
  FeatureGrid,
  type FeatureGridItem,
} from "@/components/sections/FeatureGrid";
import { FeaturedShowcase } from "@/components/sections/FeaturedShowcase";
import { AboutSection } from "@/components/sections/AboutSection";
import { LaunchPromo } from "@/components/sections/LaunchPromo";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { PageTour } from "@/components/onboarding/PageTour";
import type { Metadata } from "next";
import { platformJsonLd } from "@/lib/platformSeo";
import { serializeJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";

/** Titre, description et mots clés : ceux de la mise en page racine
 * (`platformSeo.ts`) ; ici, l'adresse canonique de l'accueil. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const features: FeatureGridItem[] = [
  {
    icon: Boxes,
    title: "Catalogue & Stock",
    description:
      "Gérez vos produits, catégories et variantes, avec un suivi de stock en temps réel et des alertes de rupture.",
  },
  {
    icon: Receipt,
    title: "Facturation automatique",
    description:
      "Générez des factures numérotées et personnalisées, à envoyer directement sur WhatsApp Business.",
  },
  {
    icon: Share2,
    title: "Publication multicanal",
    description:
      "Publiez vos produits en un clic sur WhatsApp, Facebook, Instagram et TikTok depuis un seul endroit.",
  },
  {
    icon: Tag,
    title: "Promotions flash",
    description:
      "Créez des réductions, des codes promo et des ventes flash pour booster votre panier moyen.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord",
    description:
      "Suivez votre chiffre d'affaires, vos meilleures ventes et l'état de votre stock en un coup d'œil.",
  },
  {
    icon: WifiOff,
    title: "Mode hors-ligne",
    description:
      "Application installable (PWA) : votre catalogue reste consultable même avec une connexion instable.",
  },
];

export default function Home() {
  return (
    <>
      <PageTour tourId="home" />
      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-slate-950">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(platformJsonLd(getSiteUrl())) }}
        />
        <PageBackground />
        <SiteHeader />

        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-16 px-6 py-10 sm:gap-20 sm:py-16">
          <HeroSection
            watermark="Digitalisez votre boutique : catalogue, stock, facturation et publication sur les réseaux sociaux, réunis dans une seule application installable, pensée pour le Cameroun."
            eyebrow={
              <>
                <span className="size-1.5 rounded-full bg-cyan-300" />
                boutique installable et hors-ligne
              </>
            }
            heading={
              <>
                Votre boutique, sans <HeroAccent>limites.</HeroAccent>
              </>
            }
            description="Digitalisez votre commerce au Cameroun : catalogue, stock, facturation et publication sociale, réunis dans une seule application installable."
            ctas={[
              {
                label: "Découvrir la boutique",
                href: "/catalogue",
                variant: "solid",
              },
              {
                render: <ContactSuperAdminCta />,
              },
            ]}
          />

          <FeatureGrid id="fonctionnalites" items={features} />

          <FeaturedShowcase />

          <AboutSection
            id="apropos"
            title="ManuShop, la boutique en ligne pensée pour les commerçants camerounais."
            description="ManuShop aide les commerçants à vendre en ligne sans complexité : catalogue, stock, facturation et publication sur les réseaux sociaux, réunis dans une seule application pensée pour fonctionner même avec une connexion instable."
            values={[
              {
                icon: MapPin,
                text: "Conçu au Cameroun, pour des besoins locaux : paiement mobile, WhatsApp Business, connexions instables.",
              },
              {
                icon: WifiOff,
                text: "Catalogue et commandes restent consultables même hors-ligne, grâce à l'application installable (PWA).",
              },
              {
                icon: Store,
                text: "Chaque boutique reste indépendante : ses propres produits, son propre style, sa propre clientèle.",
              },
            ]}
          />

          <LaunchPromo
            eyebrow="Promotion de lancement"
            title="Votre première vitrine digitale commence ici."
            description="Profitez de l'offre spéciale réservée aux commerçants et démarrez avec tous les outils essentiels."
            targetDate="2026-09-16T06:00:00+01:00"
          />

          <SiteFooter>
            © 2026 ManuShop · Conçu pour les commerçants.
          </SiteFooter>
        </main>
      </div>
    </>
  );
}
