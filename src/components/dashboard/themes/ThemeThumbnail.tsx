import { cn } from "cn";

/**
 * Miniature schématique d'un thème (2026-10-03) : la silhouette du tableau
 * de bord dans ses couleurs — formes seulement, aucun chiffre (rien qui
 * puisse passer pour une vraie donnée). Couleurs : uniquement les
 * variables du thème, via `data-dashboard-theme`.
 */
export function ThemeThumbnail({ dashboardTheme, className }: { dashboardTheme: string; className?: string }) {
  const card = "rounded-md border border-dash-border bg-dash-card";
  return (
    <div
      data-dashboard-theme={dashboardTheme}
      aria-hidden
      className={cn(
        "flex flex-col gap-1.5 overflow-hidden rounded-xl bg-dash-bg p-2.5 bg-[radial-gradient(ellipse_at_top_right,var(--dashboard-bg-glow),transparent_60%)]",
        className
      )}
    >
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(card, "flex items-center justify-between p-1.5")}>
            <div className="flex flex-col gap-1">
              <span className="h-1 w-6 rounded-full bg-dash-muted/60" />
              <span className="h-1.5 w-8 rounded-full bg-dash-text" />
            </div>
            <span className="size-3 rounded bg-dash-icon-bg" />
          </div>
        ))}
      </div>
      <div className="grid h-16 grid-cols-3 gap-1.5">
        <div className="col-span-2 rounded-md bg-[linear-gradient(135deg,var(--dashboard-welcome-gradient-start),var(--dashboard-welcome-gradient-end))] p-2">
          <span className="block h-1 w-8 rounded-full bg-dash-welcome-muted/70" />
          <span className="mt-1.5 block h-2 w-16 rounded-full bg-dash-welcome-text" />
        </div>
        <div className={cn(card, "flex items-center justify-center")}>
          <svg viewBox="0 0 40 40" className="size-3/4 -rotate-[225deg]">
            <circle cx="20" cy="20" r="15" fill="none" stroke="var(--gauge-track)" strokeWidth="4" strokeDasharray="70.7 94.2" strokeLinecap="round" />
            <circle cx="20" cy="20" r="15" fill="none" stroke="var(--gauge-fill)" strokeWidth="4" strokeDasharray="46 94.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="grid h-16 grid-cols-3 gap-1.5">
        <div className={cn(card, "col-span-2 p-1.5")}>
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="size-full">
            <path d="M0 24 C15 20 20 8 35 10 S55 22 70 12 S90 4 100 8 L100 30 L0 30 Z" fill="var(--chart-gradient-start)" fillOpacity="0.3" />
            <path d="M0 24 C15 20 20 8 35 10 S55 22 70 12 S90 4 100 8" fill="none" stroke="var(--chart-1)" strokeWidth="1.5" />
          </svg>
        </div>
        <div className={cn(card, "flex items-end justify-around px-1.5 pb-1.5")}>
          {[40, 70, 30, 90, 55, 75].map((h, i) => (
            <span key={i} className="w-0.5 rounded-full bg-[var(--chart-bar)]" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
