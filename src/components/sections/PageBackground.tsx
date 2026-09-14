import * as React from "react";
import Image from "next/image";
import { cn } from "cn";

import styles from "@/styles/PageBackground.module.scss";

export type PageBackgroundProps = React.HTMLAttributes<HTMLDivElement>;

/** Fixed, decorative blurred-blob backdrop used behind the glass UI. */
export function PageBackground({ className, ...props }: PageBackgroundProps) {
  return (
    <div aria-hidden className={cn(styles.background, className)} {...props}>
      <Image
        src="/images/manushop-mobile-bg.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn(styles.backgroundImage, styles["backgroundImage--mobile"])}
      />
      <Image
        src="/images/manushop-web-bg.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn(styles.backgroundImage, styles["backgroundImage--web"])}
      />
      <div className={cn(styles.blob, styles["blob--fuchsia"])} />
      <div className={cn(styles.blob, styles["blob--cyan"])} />
      <div className={cn(styles.blob, styles["blob--indigo"])} />
      <div className={cn(styles.blob, styles["blob--amber"])} />
      <div className={cn(styles.blob, styles["blob--emerald"])} />
      <div className={styles.overlay} />
    </div>
  );
}
