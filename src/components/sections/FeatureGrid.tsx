import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

import { FeatureCard, type FeatureCardProps } from "@/components/ui/FeatureCard"
import { ScrollReveal } from "@/components/ui/ScrollReveal"
import styles from "@/styles/FeatureGrid.module.scss"

export interface FeatureGridItem {
  icon: LucideIcon
  title: string
  description: string
}

export interface FeatureGridProps extends React.HTMLAttributes<HTMLElement> {
  /** Features rendered as cards inside the grid. */
  items: FeatureGridItem[]
  /** Visual style applied to every card. */
  variant?: FeatureCardProps["variant"]
}

export function FeatureGrid({
  items,
  variant = "glass",
  className,
  ...props
}: FeatureGridProps) {
  return (
    <section className={cn(styles.grid, className)} {...props}>
      {items.map((item, index) => (
        <ScrollReveal key={item.title} delay={index * 80}>
          <FeatureCard variant={variant} {...item} />
        </ScrollReveal>
      ))}
    </section>
  )
}
