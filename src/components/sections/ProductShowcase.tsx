import * as React from "react"
import { TrendingUp } from "lucide-react"
import { cn } from "cn"

import { ProductCard } from "@/components/ui/ProductCard"
import { ScrollReveal } from "@/components/ui/ScrollReveal"
import styles from "@/styles/ProductShowcase.module.scss"

export interface ShowcaseProduct {
  category: string
  name: string
  priceLabel: string
  gradient: string
}

export interface ProductShowcaseProps
  extends React.HTMLAttributes<HTMLElement> {
  eyebrow?: string
  title: string
  statLabel?: string
  products: ShowcaseProduct[]
}

export function ProductShowcase({
  eyebrow,
  title,
  statLabel,
  products,
  className,
  ...props
}: ProductShowcaseProps) {
  return (
    <section className={cn(styles.section, className)} {...props}>
      <div className={styles.header}>
        <div>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 className={styles.title}>{title}</h2>
        </div>
        {statLabel ? (
          <p className={styles.stat}>
            <TrendingUp className="size-3.5" aria-hidden />
            {statLabel}
          </p>
        ) : null}
      </div>
      <div className={styles.grid}>
        {products.map((product, index) => (
          <ScrollReveal key={product.name} delay={index * 100}>
            <ProductCard {...product} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
