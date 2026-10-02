import * as React from "react";
import { getImageProps } from "next/image";
import { cn } from "cn";

import styles from "@/styles/PageBackground.module.scss";

export type PageBackgroundProps = React.HTMLAttributes<HTMLDivElement>;

/** Même valeur que le breakpoint `md` de `styles/_breakpoints.scss`. */
const DESKTOP_MEDIA = "(min-width: 768px)";

/** Fixed, decorative blurred-blob backdrop used behind the glass UI. */
export function PageBackground({ className, ...props }: PageBackgroundProps) {
  // Art direction via <picture> (guide next/image, "Art direction") : le
  // navigateur ne télécharge que la variante qui correspond à l'écran. Avant,
  // deux <Image priority> dont l'une était masquée en CSS : les deux (~500 Ko
  // + ~700 Ko) étaient préchargées à chaque visite, l'une pour rien.
  const common = { alt: "", fill: true, sizes: "100vw" } as const;
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: "/images/manushop-web-bg.jpeg" });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, src: "/images/manushop-mobile-bg.jpeg" });

  return (
    <div aria-hidden className={cn(styles.background, className)} {...props}>
      <picture>
        <source media={DESKTOP_MEDIA} srcSet={desktop} />
        <source srcSet={mobile} />
        {/* Visible dès l'arrivée sur la page : chargé tout de suite plutôt
        qu'en différé, contrairement aux autres images de l'application. */}
        <img
          {...rest}
          alt=""
          loading="eager"
          fetchPriority="high"
          className={styles.backgroundImage}
        />
      </picture>
      <div className={cn(styles.blob, styles["blob--fuchsia"])} />
      <div className={cn(styles.blob, styles["blob--cyan"])} />
      <div className={cn(styles.blob, styles["blob--indigo"])} />
      <div className={cn(styles.blob, styles["blob--amber"])} />
      <div className={cn(styles.blob, styles["blob--emerald"])} />
      <div className={styles.overlay} />
    </div>
  );
}
