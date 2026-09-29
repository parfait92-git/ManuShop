import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import styles from "@/styles/AboutSection.module.scss";

export interface AboutSectionValue {
  icon: LucideIcon;
  text: string;
}

export interface AboutSectionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description: string;
  values?: AboutSectionValue[];
}

/**
 * Contenu réel de "À propos" (BF-131bis, 2026-09-28) — jusqu'ici ce lien de
 * navigation pointait par erreur vers `LaunchPromo` (l'offre de lancement
 * promotionnelle), qui n'a jamais présenté ManuShop lui-même.
 */
export function AboutSection({
  eyebrow = "À propos",
  title,
  description,
  values = [],
  className,
  ...props
}: AboutSectionProps) {
  return (
    <section className={cn(styles.section, className)} {...props}>
      <ScrollReveal>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </ScrollReveal>

      {values.length > 0 ? (
        <ScrollReveal delay={120} className={styles.values}>
          {values.map(({ icon: Icon, text }, index) => (
            <div key={index} className={styles.value}>
              <span aria-hidden className={styles.value__icon}>
                <Icon className="size-4" />
              </span>
              <p className={styles.value__text}>{text}</p>
            </div>
          ))}
        </ScrollReveal>
      ) : null}
    </section>
  );
}
