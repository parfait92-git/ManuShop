"use client";

import { ExternalLink } from "lucide-react";

import { useShopBranding } from "@/components/providers/ShopBrandingProvider";
import { SOCIAL_NETWORK_LABELS } from "@/lib/shopSocialNetworks";
import type { PrimarySocialNetwork } from "@/models/shop/Shop";

const NETWORK_ORDER: PrimarySocialNetwork[] = [
  "whatsapp",
  "facebook",
  "instagram",
  "tiktok",
];

/**
 * BF-106 : icônes réseaux sociaux en pied de page d'une boutique précise —
 * n'affiche rien sur les pages sans contexte boutique (`/catalogue`,
 * `/boutiques`) puisque `useShopBranding()` y reste `null`. Le contenu vient
 * de `ShopStorefrontPage` (`socialLinksFor`), déjà filtré par lien renseigné
 * + privilège premium `socialFooterLinks` : ce composant se contente
 * d'afficher ce qu'on lui donne.
 */
export function StorefrontFooter() {
  const { branding } = useShopBranding();
  const links = branding?.socialLinks;
  const entries = links
    ? NETWORK_ORDER.filter((network) => links[network]).map((network) => ({
        network,
        href: links[network] as string,
      }))
    : [];

  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      <p>
        © {new Date().getFullYear()} ManuShop · Des commerces locaux, une
        expérience unique.
      </p>
      {entries.length > 0 ? (
        <nav
          aria-label={`Réseaux sociaux de ${branding?.name ?? "la boutique"}`}
          className="mt-3 flex flex-wrap items-center justify-center gap-4"
        >
          {entries.map(({ network, href }) => (
            <a
              key={network}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-foreground hover:text-primary"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {SOCIAL_NETWORK_LABELS[network]}
            </a>
          ))}
        </nav>
      ) : null}
    </footer>
  );
}
