import * as React from "react"
import { cn } from "cn"

import styles from "@/styles/SiteFooter.module.scss"

export type SiteFooterProps = React.HTMLAttributes<HTMLElement>

export function SiteFooter({ className, children, ...props }: SiteFooterProps) {
  return (
    <footer className={cn(styles.footer, className)} {...props}>
      {children}
    </footer>
  )
}
