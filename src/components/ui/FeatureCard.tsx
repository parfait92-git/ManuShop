import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

import styles from "@/styles/FeatureCard.module.scss"

export interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon component rendered inside the card's icon badge. */
  icon: LucideIcon
  /** Card heading. */
  title: string
  /** Card body copy. */
  description: string
  /** Visual style of the card. */
  variant?: "glass" | "solid"
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  variant = "glass",
  className,
  ...props
}: FeatureCardProps) {
  return (
    <div
      className={cn(styles.card, styles[`card--${variant}`], className)}
      {...props}
    >
      <div aria-hidden className={styles.card__glare} />
      <div className={styles.card__icon}>
        <Icon className="size-5" />
      </div>
      <h3 className={styles.card__title}>{title}</h3>
      <p className={styles.card__description}>{description}</p>
    </div>
  )
}
