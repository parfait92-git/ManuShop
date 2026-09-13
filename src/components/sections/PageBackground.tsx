import * as React from "react"
import { cn } from "cn"

import styles from "@/styles/PageBackground.module.scss"

export type PageBackgroundProps = React.HTMLAttributes<HTMLDivElement>

/** Fixed, decorative blurred-blob backdrop used behind the glass UI. */
export function PageBackground({ className, ...props }: PageBackgroundProps) {
  return (
    <div aria-hidden className={cn(styles.background, className)} {...props}>
      <div className={cn(styles.blob, styles["blob--fuchsia"])} />
      <div className={cn(styles.blob, styles["blob--cyan"])} />
      <div className={cn(styles.blob, styles["blob--indigo"])} />
      <div className={cn(styles.blob, styles["blob--amber"])} />
      <div className={cn(styles.blob, styles["blob--emerald"])} />
      <div className={styles.overlay} />
    </div>
  )
}
