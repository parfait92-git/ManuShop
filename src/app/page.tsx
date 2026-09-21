import {
  BarChart3,
  Boxes,
  Phone,
  Receipt,
  Share2,
  Tag,
  WifiOff,
} from "lucide-react";

import { PageBackground } from "@/components/sections/PageBackground";
import { SiteHeader } from "@/components/sections/SiteHeader";
import {
  HeroAccent,
  HeroSection,
} from "@/components/sections/HeroSection";
import {
  FeatureGrid,
  type FeatureGridItem,
} from "@/components/sections/FeatureGrid";
import { ProductShowcase } from "@/components/sections/ProductShowcase";
import { LaunchPromo } from "@/components/sections/LaunchPromo";
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

const showcaseProducts = [
  {
    category: "Mode",
    name: "Ensemble Wax Moderne",
    priceLabel: "24 800 FCFA",
    gradient: "linear-gradient(160deg, #d946ef 0%, #7c3aed 100%)",
  },
  {
    category: "Accessoires",
    name: "Sac à main artisanal",
    priceLabel: "12 500 FCFA",
    gradient: "linear-gradient(160deg, #22d3ee 0%, #2563eb 100%)",
  },
  {
    category: "Chaussures",
    name: "Sandales en cuir",
    priceLabel: "9 400 FCFA",
    gradient: "linear-gradient(160deg, #fb923c 0%, #f59e0b 55%, #f472b6 100%)",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-slate-950">
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
              label: (
                <>
                  <Phone className="size-4" />
                  Nous contacter
                </>
              ),
              href: "mailto:bonjour@manushop.cm",
              variant: "ghost",
            },
          ]}
        />

        <FeatureGrid id="fonctionnalites" items={features} />

        <ProductShowcase
          id="boutique"
          eyebrow="La sélection du moment"
          title="Vendez plus simplement."
          statLabel="+120% de commandes ce mois"
          products={showcaseProducts}
        />

        <LaunchPromo
          id="apropos"
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
  );
}
