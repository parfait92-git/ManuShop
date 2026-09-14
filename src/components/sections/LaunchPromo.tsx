"use client";

import * as React from "react";
import { cn } from "cn";

import { getTimeParts, pad2 } from "@/lib/countdown";
import styles from "@/styles/LaunchPromo.module.scss";

export interface LaunchPromoProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow?: string;
  title: string;
  description: string;
  targetDate: string;
}

const UNIT_LABELS = [
  { key: "days", label: "Jours" },
  { key: "hours", label: "Heures" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
] as const;

export function LaunchPromo({
  eyebrow,
  title,
  description,
  targetDate,
  className,
  ...props
}: LaunchPromoProps) {
  const targetMs = Date.parse(targetDate);

  // Start at null so the server and initial client render match; the real
  // clock only kicks in after mount, avoiding a hydration mismatch.
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = getTimeParts(targetMs, now ?? targetMs);

  return (
    <section className={cn(styles.section, className)} {...props}>
      <div>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.countdown} aria-live="polite">
        <p className={styles.countdownLabel}>L’offre expire dans</p>
        <div className={styles.units}>
          {UNIT_LABELS.map((unit) => (
            <div key={unit.key} className={styles.unit}>
              <span className={styles.value}>{pad2(parts[unit.key])}</span>
              <span className={styles.label}>{unit.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
