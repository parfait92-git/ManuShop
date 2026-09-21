import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "cn"

import styles from "@/styles/ProductCard.module.scss"

export interface ProductCardProps extends React.HTMLAttributes<HTMLElement> {
  category: string
  name: string
  priceLabel: string
  gradient: string
  href?: string
}

export function ProductCard({
  category,
  name,
  priceLabel,
  gradient,
  href = "/catalogue",
  className,
  ...props
}: ProductCardProps) {
  return (
    <article
      className={cn(styles.card, className)}
      style={{ backgroundImage: gradient }}
      {...props}
    >
      <p className={styles.card__category}>{category}</p>
      <div className={styles.card__row}>
        <div>
          <h3 className={styles.card__name}>{name}</h3>
          <p className={styles.card__price}>{priceLabel}</p>
        </div>
        <a
          className={styles.card__add}
          href={href}
          aria-label={`Ajouter ${name} au panier`}
        >
          <Plus className="size-4" />
        </a>
      </div>
    </article>
  )
}
