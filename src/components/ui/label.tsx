import { Children, isValidElement } from "react";
import { cn } from "cn";

import { CoachMark } from "@/components/ui/CoachMark";

/** Texte brut d'un libellé ("Prix (FCFA)"), pour nommer son bouton d'aide
 * auprès des lecteurs d'écran. */
function textOf(node: React.ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: React.ReactNode }>(child)) {
        return textOf(child.props.children);
      }
      return "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function Label({
  className,
  help,
  children,
  ...props
}: React.ComponentProps<"label"> & {
  /** Rôle et utilité du champ, affichés par un bouton "?" à côté du
   * libellé (au survol, au toucher ou au clavier, voir `CoachMark`). */
  help?: React.ReactNode;
}) {
  const label = (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );

  if (!help) return label;

  // Le "?" est posé à côté du <label>, jamais dedans : un bouton dans un
  // <label> est invalide, et un clic dessus activerait aussi le champ.
  return (
    <div className="flex items-center gap-1.5">
      {label}
      <CoachMark label={`Aide : ${textOf(children) || "ce champ"}`}>{help}</CoachMark>
    </div>
  );
}

export { Label };
