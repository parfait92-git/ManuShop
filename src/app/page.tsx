import {
  BarChart3,
  Boxes,
  Receipt,
  Share2,
  Sparkles,
  Tag,
  WifiOff,
} from "lucide-react";

import { PageBackground } from "@/components/sections/PageBackground";
import { HeroSection } from "@/components/sections/HeroSection";
import {
  FeatureGrid,
  type FeatureGridItem,
} from "@/components/sections/FeatureGrid";
import { SiteFooter } from "@/components/sections/SiteFooter";

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
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-slate-950">
      <PageBackground />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-16 px-6 py-20 sm:py-28">
        <HeroSection
          eyebrow={
            <>
              <Sparkles className="size-4 text-amber-300" />
              PWA · Boutique numérique multicanal
            </>
          }
          title="ManuShop"
          description="Digitalisez votre boutique : catalogue, stock, facturation et publication sur les réseaux sociaux, réunis dans une seule application installable, pensée pour le Cameroun."
          ctas={[
            {
              label: "Découvrir la boutique",
              href: "#fonctionnalites",
              variant: "glass",
            },
            {
              label: "Espace gérant",
              href: "#fonctionnalites",
              variant: "ghost",
            },
          ]}
        />

        <FeatureGrid id="fonctionnalites" items={features} />

        <SiteFooter>
          ManuShop — Conçu pour les commerçants camerounais.
        </SiteFooter>
      </main>
    </div>
  );
}

