import { Sparkles } from "lucide-react";

/**
 * Bandeau "Exemple" au-dessus d'un aperçu en lecture seule construit à
 * partir de `src/data/mockData.ts`, affiché quand une section du dashboard
 * (produits/catégories/équipe) n'a encore aucune vraie donnée. La vraie page
 * (formulaire d'ajout, etc.) reste affichée au-dessus — on ne redirige
 * jamais l'admin loin de ses propres outils, contrairement à `/catalogue`
 * qui bascule vers `/demo-catalogue` pour un visiteur qui n'a rien à perdre.
 */
export function DemoPreviewBanner({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-primary">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
