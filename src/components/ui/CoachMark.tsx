import { HelpCircle } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * BF-136 : bulle d'aide affichée à la demande (clic/tap), pas au survol —
 * contrairement à `FieldHint` (`title` natif du navigateur), fonctionne
 * aussi bien sur mobile, où `:hover`/`title` n'existent pas. Réservé aux
 * explications qui méritent plus qu'une ligne (`FieldHint` reste adapté
 * pour un texte très court) : un champ complexe, une fonctionnalité peu
 * évidente. Construit sur le `Popover` Base UI déjà utilisé ailleurs dans
 * l'app (`Dialog`, `Switch`), pas `react-joyride` (réservé au tour
 * séquentiel, BF-135) — pas de séquence ici, un point d'aide isolé.
 */
export function CoachMark({
  label = "Aide",
  children,
}: {
  /** `aria-label` du bouton déclencheur — décrit ce sur quoi porte l'aide. */
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className="inline-flex text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
      >
        <HelpCircle className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent>{children}</PopoverContent>
    </Popover>
  );
}
