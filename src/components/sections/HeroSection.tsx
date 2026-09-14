import * as React from "react"
import { cn } from "cn"

import { Badge } from "@/components/ui/Badge"
import { GlassButton, type GlassButtonProps } from "@/components/ui/GlassButton"
import styles from "@/styles/HeroSection.module.scss"

export interface HeroCta {
  label: React.ReactNode
  href: string
  variant?: GlassButtonProps["variant"]
}

export interface HeroSectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Content rendered inside the eyebrow badge above the title. */
  eyebrow?: React.ReactNode
  /** Large faded copy sitting behind the heading. */
  watermark?: string
  /** Hero heading. */
  title: React.ReactNode
  /** Hero supporting copy. */
  description: string
  /** Call-to-action buttons rendered below the description. */
  ctas?: HeroCta[]
}

export function HeroAccent({ children }: { children: React.ReactNode }) {
  return <em className={styles.hero__accent}>{children}</em>
}

export function HeroSection({
  eyebrow,
  watermark,
  title,
  description,
  ctas = [],
  className,
  ...props
}: HeroSectionProps) {
  return (
    <section className={cn(styles.hero, className)} {...props}>
      {watermark ? (
        <p aria-hidden className={styles.hero__watermark}>
          {watermark}
        </p>
      ) : null}
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <h1 className={styles.hero__title}>{title}</h1>
      <p className={styles.hero__description}>{description}</p>
      {ctas.length > 0 ? (
        <div className={styles.hero__actions}>
          {ctas.map(({ label, href, variant }) => (
            <GlassButton key={href} href={href} variant={variant}>
              {label}
            </GlassButton>
          ))}
        </div>
      ) : null}
    </section>
  )
}
