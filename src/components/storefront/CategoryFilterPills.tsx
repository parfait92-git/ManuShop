import { cn } from "cn";

export function CategoryFilterPills({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
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
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelect(category)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            selected === category
              ? "bg-foreground text-background"
              : "border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
