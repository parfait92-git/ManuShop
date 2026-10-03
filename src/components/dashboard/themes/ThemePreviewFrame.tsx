"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";

import { ThemeThumbnail } from "@/components/dashboard/themes/ThemeThumbnail";
import { TABLET_UP, useMediaQuery } from "@/hooks/useMediaQuery";

/** Largeur à laquelle le tableau de bord est dessiné avant réduction. */
const DESIGN_WIDTH = 1180;

const DashboardOverview = dynamic(
  () => import("@/components/dashboard/overview/DashboardOverview").then((m) => m.DashboardOverview),
  { ssr: false }
);

/**
 * Aperçu du tableau de bord dans un thème (2026-10-03), avant de
 * l'appliquer. Tablette et ordinateur : le vrai tableau de bord, avec les
 * vrais chiffres de la boutique, réduit pour tenir dans la fenêtre.
 * Mobile : la miniature, pour ne pas y charger les graphiques.
 */
export function ThemePreviewFrame({ shopId, dashboardTheme }: { shopId: string; dashboardTheme: string }) {
  const isTabletUp = useMediaQuery(TABLET_UP);
  const frameRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 0, height: 0 });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return;
    const update = () => {
      const scale = frame.clientWidth / DESIGN_WIDTH;
      setSize({ scale, height: inner.offsetHeight * scale });
    };
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(inner);
    update();
    return () => observer.disconnect();
  }, [isTabletUp]);

  if (!isTabletUp) {
    return <ThemeThumbnail dashboardTheme={dashboardTheme} />;
  }

  return (
    <div
      ref={frameRef}
      data-tour="theme-preview-frame"
      className="max-h-[60vh] overflow-y-auto rounded-xl border border-border"
    >
      {/* `inert` : un aperçu, pas un écran à utiliser (liens et
      infobulles désactivés, rien au clavier). */}
      <div style={{ height: size.height }} className="relative overflow-hidden" inert>
        <div
          ref={innerRef}
          style={{ width: DESIGN_WIDTH, transform: `scale(${size.scale})`, transformOrigin: "top left" }}
          className="absolute top-0 left-0"
        >
          <DashboardOverview shopId={shopId} theme={dashboardTheme} />
        </div>
      </div>
    </div>
  );
}
