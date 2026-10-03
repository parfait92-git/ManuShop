import { PageBackground } from "@/components/sections/PageBackground";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { ContactSuperAdminCta } from "@/components/storefront/ContactSuperAdminCta";
import {
  HeroAccent,
  HeroSection,
} from "@/components/sections/HeroSection";
import { ComingSoonStrip } from "@/components/sections/ComingSoonStrip";
import { FeatureGrid } from "@/components/sections/FeatureGrid";
import {
  ABOUT_DESCRIPTION,
  ABOUT_VALUES,
  FEATURES,
  HERO_DESCRIPTION,
  HERO_EYEBROW,
  HERO_WATERMARK,
} from "@/components/sections/landingContent";
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
            watermark={HERO_WATERMARK}
            eyebrow={
              <>
                <span className="size-1.5 rounded-full bg-cyan-300" />
                {HERO_EYEBROW}
              </>
            }
            heading={
              <>
                Votre boutique, sans <HeroAccent>limites.</HeroAccent>
              </>
            }
            description={HERO_DESCRIPTION}
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

          <div className="flex w-full flex-col gap-6">
            <FeatureGrid id="fonctionnalites" items={FEATURES} />
            <ComingSoonStrip />
          </div>

          <FeaturedShowcase />

          <AboutSection
            id="apropos"
            title="ManuShop, la boutique en ligne pensée pour les commerçants camerounais."
            description={ABOUT_DESCRIPTION}
            values={ABOUT_VALUES}
          />

          <LaunchPromo
            eyebrow="Promotion de lancement"
            title="Votre première vitrine digitale commence ici."
            description="Profitez de l'offre spéciale réservée aux commerçants et démarrez avec tous les outils essentiels."
            targetDate="2026-10-30T23:59:59+01:00"
          />

          <SiteFooter>
            © 2026 ManuShop · Conçu pour les commerçants.
          </SiteFooter>
        </main>
      </div>
    </>
  );
}
