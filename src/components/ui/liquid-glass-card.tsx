"use client"

import * as React from "react"
import { cn } from "cn"

import styles from "./liquid-glass-card.module.scss"

/**
 * "Liquid Glass" card (iOS-style glassmorphism): blurred translucent
 * background, refractive border ring, and an iridescent blob that follows
 * the pointer. Visual rules live in liquid-glass-card.module.scss; this
 * component only tracks the pointer position.
 */
function LiquidGlassCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const cardRef = React.useRef<HTMLDivElement>(null)

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = cardRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    node.style.setProperty("--x", `${x}%`)
    node.style.setProperty("--y", `${y}%`)
  }

  const handlePointerLeave = () => {
    cardRef.current?.style.setProperty("--x", "50%")
    cardRef.current?.style.setProperty("--y", "50%")
  }

  return (
    <div
      ref={cardRef}
      data-slot="liquid-glass-card"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        styles.liquidGlass,
        "overflow-hidden rounded-3xl border border-white/20 p-6",
        className
      )}
      {...props}
    >
      <span className={styles.liquidGlassBlob} aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function LiquidGlassCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="liquid-glass-card-header"
      className={cn("mb-3 flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function LiquidGlassCardTitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="liquid-glass-card-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function LiquidGlassCardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="liquid-glass-card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function LiquidGlassCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="liquid-glass-card-content"
      className={cn("text-sm text-foreground/80", className)}
      {...props}
    />
  )
}

function LiquidGlassCardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="liquid-glass-card-footer"
      className={cn("mt-4 flex items-center gap-2", className)}
      {...props}
    />
  )
}

export {
  LiquidGlassCard,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
  LiquidGlassCardDescription,
  LiquidGlassCardContent,
  LiquidGlassCardFooter,
}
