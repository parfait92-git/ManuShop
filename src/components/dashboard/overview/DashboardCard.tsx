import { cn } from "cn";

/** Fond, bordure, rayon et ombre des cartes : uniquement des variables du
 * thème (`src/styles/dashboard-theme.css`). */
export const DASHBOARD_CARD_CLASS =
  "rounded-dash border border-dash-border shadow-dash text-dash-text bg-[linear-gradient(127deg,var(--dashboard-card-gradient-start),var(--dashboard-card-gradient-end))]";

export function DashboardCard({
  title,
  subtitle,
  action,
  dataTour,
  className,
  children,
}: {
  title?: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  dataTour?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-tour={dataTour}
      aria-label={title}
      className={cn(DASHBOARD_CARD_CLASS, "flex min-w-0 flex-col gap-4 p-5 lg:p-6", className)}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold break-words">{title}</h2>}
            {subtitle && <div className="mt-0.5 text-sm text-dash-muted">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Pas encore de données : un message honnête, jamais un graphique fictif. */
export function DashboardEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-dash-border px-4 py-10 text-center text-sm text-dash-muted">
      {children}
    </div>
  );
}
