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
import { isLaunchPromoVisible } from "@/lib/launchPromo";
import { getLaunchPromo, getPublicSiteUrl } from "@/server/seo/publicData";

/** Titre, description et mots clés : ceux de la mise en page racine
 * (`platformSeo.ts`) ; ici, l'adresse canonique de l'accueil. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** La promotion de l'accueil se règle dans Super Admin → Réglages : la page
 * est régénérée dès l'enregistrement (`setLaunchPromoAction`), et au plus
 * tard toutes les 5 minutes. */
export const revalidate = 300;


export default async function Home() {
  const [promo, siteUrl] = await Promise.all([getLaunchPromo(), getPublicSiteUrl()]);
  return (
    <>
      <PageTour tourId="home" />
      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-slate-950">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(platformJsonLd(siteUrl)) }}
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

          {promo && isLaunchPromoVisible(promo) && (
            <LaunchPromo
              eyebrow={promo.eyebrow || undefined}
              title={promo.title}
              description={promo.description}
              targetDate={promo.endsAt}
            />
          )}

          <SiteFooter>
            © 2026 ManuShop · Conçu pour les commerçants.
          </SiteFooter>
        </main>
      </div>
    </>
  );
}
