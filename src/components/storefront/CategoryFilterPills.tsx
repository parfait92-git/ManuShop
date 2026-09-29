import { cn } from "cn";

export interface FilterPillOption {
  /** Valeur transmise à `onSelect` — un id de tag système (Marché) ou un
   * nom de catégorie brut (boutique unique), selon l'appelant. */
  value: string;
  label: string;
  /** Couleur hex du tag (BF-109→111) — absente pour un nom de catégorie
   * brut, qui n'a pas de couleur associée. */
  color?: string;
}

export function CategoryFilterPills({
  categories,
  selected,
  onSelect,
}: {
  categories: FilterPillOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition-colors",
          selected === null
            ? "bg-foreground text-background"
            : "border border-border text-muted-foreground hover:text-foreground"
        )}
      >
        Tous les produits
      </button>
      {categories.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            selected === option.value
              ? "bg-foreground text-background"
              : "border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {option.color ? (
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: option.color }}
            />
          ) : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}
