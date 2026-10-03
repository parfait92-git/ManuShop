import type { LucideIcon } from "lucide-react";

export function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 rounded-xl border border-dashed border-shell-border-strong bg-shell-surface px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-shell-accent-soft text-shell-accent">
        <Icon className="size-6" />
      </span>
      <h1 className="text-xl font-semibold text-shell-text">{title}</h1>
      <p className="max-w-sm text-sm text-shell-subtle">{description}</p>
      <p className="text-xs font-medium text-shell-accent">Bientôt disponible</p>
    </div>
  );
}
