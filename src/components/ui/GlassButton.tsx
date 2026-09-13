import * as React from "react"
import { cn } from "cn"

import styles from "@/styles/GlassButton.module.scss"

export interface GlassButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Visual style of the button. */
  variant?: "glass" | "ghost" | "solid"
}

export function GlassButton({
  variant = "glass",
  href = "#",
  className,
  children,
  ...props
}: GlassButtonProps) {
  return (
    <a
      href={href}
      className={cn(styles.button, styles[`button--${variant}`], className)}
      {...props}
    >
      {children}
    </a>
  )
}
