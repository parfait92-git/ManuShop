import { Loader2 } from "lucide-react";
import { cn } from "cn";

/** Indicateur de chargement rotatif. Décoratif par défaut (`aria-hidden`) :
 * le texte qui l'accompagne ("Envoi en cours...") porte l'information. */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 aria-hidden className={cn("size-4 animate-spin", className)} />
  );
}
