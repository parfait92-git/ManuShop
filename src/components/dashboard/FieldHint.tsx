import { HelpCircle } from "lucide-react";

/** Petite bulle d'aide au survol/focus, pour un débutant qui découvre un
 * formulaire — pas de librairie de tooltip pour un simple texte statique. */
export function FieldHint({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      aria-label={text}
      className="inline-flex text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
    >
      <HelpCircle className="size-3.5" />
    </span>
  );
}
