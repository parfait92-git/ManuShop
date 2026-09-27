import * as React from "react"
import { cn } from "cn"

import { Badge } from "@/components/ui/Badge"
import { GlassButton, type GlassButtonProps } from "@/components/ui/GlassButton"
import styles from "@/styles/HeroSection.module.scss"

export interface HeroCta {
  label?: React.ReactNode
  href?: string
  variant?: GlassButtonProps["variant"]
  /** Rendu tel quel à la place d'un `GlassButton` lien — pour un CTA
   * interactif (ouvre un dialogue, etc.) qui ne peut pas être un simple
   * `<a href>` server-renderable, tout en restant dans la même rangée
   * d'actions. `HeroSection` reste un composant de présentation pur : c'est
   * l'appelant qui fournit le composant client déjà instancié. */
  render?: React.ReactNode
}

export interface HeroSectionProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow?: React.ReactNode
  watermark?: string
  heading: React.ReactNode
  description: string
  ctas?: HeroCta[]
}

export function HeroAccent({ children }: { children: React.ReactNode }) {
  return <em className={styles.hero__accent}>{children}</em>
}

export function HeroSection({
  eyebrow,
  watermark,
  heading,
  description,
  ctas = [],
  className,
  ...props
}: HeroSectionProps) {
  return (
    <section className={cn(styles.hero, className)} {...props}>
      {watermark ? (
        <p className={styles.hero__watermark}>{watermark}</p>
      ) : null}
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <h1 className={styles.hero__title}>{heading}</h1>
      <p className={styles.hero__description}>{description}</p>
      {ctas.length > 0 ? (
        <div className={styles.hero__actions}>
          {ctas.map(({ label, href, variant, render }, index) =>
            render ? (
              <React.Fragment key={index}>{render}</React.Fragment>
            ) : (
              <GlassButton key={href} href={href} variant={variant}>
                {label}
              </GlassButton>
            )
          )}
        </div>
      ) : null}
    </section>
  )
}
