"use client";

import { Star } from "lucide-react";

/** Note de 1 à 5 étoiles, facultative (0 = pas de note). Un second clic sur
 * la note choisie l'efface. */
export function StarRatingInput({
  value,
  onChange,
  label = "Note",
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          onClick={() => onChange(value === star ? 0 : star)}
          className="text-muted-foreground"
        >
          <Star className={value >= star ? "size-6 fill-amber-500 text-amber-500" : "size-6"} />
        </button>
      ))}
    </div>
  );
}

/** Note affichée en lecture seule. */
export function StarRatingDisplay({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} sur 5`} role="img">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={value >= star ? "size-4 fill-amber-500 text-amber-500" : "size-4 text-muted-foreground"}
        />
      ))}
    </span>
  );
}
