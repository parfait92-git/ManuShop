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
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
        <Icon className="size-6" />
      </span>
      <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
      <p className="max-w-sm text-sm text-slate-500">{description}</p>
      <p className="text-xs font-medium text-cyan-600">Bientôt disponible</p>
    </div>
  );
}
