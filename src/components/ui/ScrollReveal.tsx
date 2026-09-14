"use client";

import * as React from "react";
import { cn } from "cn";

import styles from "@/styles/ScrollReveal.module.scss";

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Delay in milliseconds before starting the entrance animation. */
  delay?: number;
  /** Distance in pixels to slide upwards during reveal. Default 24. */
  distance?: number;
  /** Class name passed to the container element. */
  className?: string;
  /** Tag to render. Defaults to "div". */
  as?: React.ElementType;
}

/**
 * Wraps elements and animates them with opacity and slide-up when they scroll into view.
 */
export function ScrollReveal({
  children,
  delay = 0,
  distance = 24,
  className,
  as: Component = "div",
  style,
  ...props
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If IntersectionObserver is not supported (SSR / old browsers / tests), reveal immediately
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={ref}
      className={cn(
        styles.reveal,
        isVisible && styles["reveal--visible"],
        className,
      )}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-distance": `${distance}px`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </Component>
  );
}
