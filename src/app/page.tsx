import {
  BarChart3,
  Boxes,
  Receipt,
  Share2,
  Sparkles,
  Tag,
  WifiOff,
} from "lucide-react";

const features = [
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
      {/* Liquid Glass background: blurred color blobs shining through frosted panels */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-fuchsia-500/40 blur-3xl" />
        <div className="absolute top-1/4 -right-32 h-[28rem] w-[28rem] rounded-full bg-cyan-400/30 blur-3xl" />
        <div className="absolute top-[55%] left-1/3 h-[32rem] w-[32rem] rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute bottom-0 -left-16 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/50 to-slate-950/80" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-16 px-6 py-20 sm:py-28">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-xl backdrop-saturate-150">
            <Sparkles className="size-4 text-amber-300" />
            PWA · Boutique numérique multicanal
          </div>

          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            ManuShop
          </h1>

          <p className="max-w-xl text-lg leading-8 text-white/70">
            Digitalisez votre boutique : catalogue, stock, facturation et
            publication sur les réseaux sociaux, réunis dans une seule
            application installable, pensée pour le Cameroun.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <a
              href="#fonctionnalites"
              className="rounded-full border border-white/30 bg-white/15 px-6 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:bg-white/25 hover:shadow-lg active:scale-[0.98]"
            >
              Découvrir la boutique
            </a>
            <a
              href="#fonctionnalites"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 backdrop-blur-xl backdrop-saturate-150 transition-all hover:bg-white/10 hover:text-white active:scale-[0.98]"
            >
              Espace gérant
            </a>
          </div>
        </section>

        {/* Features */}
        <section
          id="fonctionnalites"
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/8 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:bg-white/12 hover:shadow-xl"
            >
              {/* Glass glare highlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-white/20 blur-2xl transition-opacity group-hover:opacity-80"
              />
              <div className="relative mb-4 flex size-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                <Icon className="size-5" />
              </div>
              <h2 className="relative mb-1.5 text-base font-semibold text-white">
                {title}
              </h2>
              <p className="relative text-sm leading-6 text-white/65">{description}</p>
            </div>
          ))}
        </section>

        <footer className="mt-auto pt-8 text-center text-xs text-white/40">
          ManuShop — Conçu pour les commerçants camerounais.
        </footer>
      </main>
    </div>
  );
}

