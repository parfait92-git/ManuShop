import * as React from "react"
import { cn } from "cn"

import styles from "@/styles/Badge.module.scss"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual style of the badge. */
  variant?: "glass" | "solid"
  /** Optional leading icon rendered before the children. */
  icon?: React.ReactNode
}

export function Badge({
  variant = "glass",
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(styles.badge, styles[`badge--${variant}`], className)}
      {...props}
    >
      {icon ? <span className={styles.badge__icon}>{icon}</span> : null}
      {children}
    </div>
  )
}
