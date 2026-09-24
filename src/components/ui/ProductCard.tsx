import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "cn"
import Image from "next/image"

import styles from "@/styles/ProductCard.module.scss"

export interface ProductCardProps extends React.HTMLAttributes<HTMLElement> {
  category: string
  name: string
  priceLabel: string
  gradient: string
  /** Optionnelle : sans elle, la carte reste un pur dégradé (comportement
   * d'origine). Avec elle, le dégradé devient un voile coloré semi-
   * transparent au-dessus de la photo plutôt que le fond lui-même — garde
   * le texte lisible sans masquer complètement l'image. */
  image?: string
  href?: string
}

export function ProductCard({
  category,
  name,
  priceLabel,
  gradient,
  image,
  href = "/catalogue",
  className,
  ...props
}: ProductCardProps) {
  return (
    <article
      className={cn(styles.card, className)}
      style={image ? undefined : { backgroundImage: gradient }}
      {...props}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className={styles.card__image}
        />
      )}
      {image && (
        <div
          className={styles.card__overlay}
          style={{ backgroundImage: gradient }}
        />
      )}
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
