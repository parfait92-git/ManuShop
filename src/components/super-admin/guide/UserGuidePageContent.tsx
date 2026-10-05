"use client";

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, FileDown, ListTree, Loader2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { CoachMark } from "@/components/ui/CoachMark";
import { GUIDE_VERSION, GUIDES } from "@/content/guides";
import type { Guide, GuideRole } from "@/content/guides/types";

import {
  A4,
  BlockView,
  ChapterHead,
  FramedSheet,
  GuideSheets,
  Measured,
  TocLine,
  TocTitle,
} from "./GuideDocument";
import {
  TOC_TITLE_KEY,
  blockKey,
  chapterKey,
  paginateGuide,
  tocEntries,
  tocKey,
  type GuideLayout,
  type Heights,
} from "./paginate";

const PRINT_CSS = `
.guide-print-root { display: none; }
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff !important; }
  body > *:not(.guide-print-root) { display: none !important; }
  .guide-print-root { display: block !important; }
  .guide-print-root .guide-a4 { break-after: page; }
  .guide-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

/**
 * Mesure, hors écran, la hauteur de chaque élément d'un guide à sa taille
 * d'impression, puis le répartit en pages A4 (`paginateGuide`).
 */
function MeasureLayer({ guide, onLayout }: { guide: Guide; onLayout: (layout: GuideLayout) => void }) {
  const probe = useRef<HTMLDivElement>(null);
  const items = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let active = true;
    const measure = () => {
      if (!active || !probe.current || !items.current) return;
      const main = probe.current;
      const available = main.clientHeight - parseFloat(getComputedStyle(main).paddingTop);
      const heights: Heights = new Map();
      items.current.querySelectorAll<HTMLElement>("[data-measure]").forEach((el) => {
        heights.set(el.dataset.measure!, el.getBoundingClientRect().height);
      });
      onLayout(paginateGuide(guide, heights, available));
    };
    // Polices chargées d'abord : elles changent la hauteur des textes.
    (document.fonts?.ready ?? Promise.resolve()).then(measure);
    return () => {
      active = false;
    };
  }, [guide, onLayout]);

  return (
    <div aria-hidden className="pointer-events-none fixed top-0 -left-[10000px] invisible">
      <FramedSheet guide={guide} heading="" page={0} total={0} version="" mainRef={probe} />
      <div ref={items} className="text-slate-700" style={{ width: `${A4.widthMm - 36}mm` }}>
        {guide.chapters.map((chapter, c) => (
          <div key={chapter.id}>
            <Measured id={chapterKey(c)} gap="6mm">
              <ChapterHead number={c + 1} title={chapter.title} />
            </Measured>
            {chapter.blocks.map((block, b) => (
              <Measured key={b} id={blockKey(c, b)}>
                <BlockView block={block} figure={0} />
              </Measured>
            ))}
          </div>
        ))}
        <Measured id={TOC_TITLE_KEY}>
          <TocTitle />
        </Measured>
        {tocEntries(guide).map((entry, i) => (
          <Measured key={i} id={tocKey(i)} gap="0">
            <TocLine entry={entry} />
          </Measured>
        ))}
      </div>
    </div>
  );
}

/** Échelle d'affichage d'une page A4 selon la largeur disponible. */
function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / A4.widthPx)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

/**
 * Guides d'utilisation (2026-10-04), réservés au Super Admin : un guide par
 * rôle (client, vendeur, gérant, Super Admin), mis en page comme un
 * document A4 — couverture, sommaire, chapitres illustrés de captures —,
 * feuilleté page par page et exportable en PDF pour être remis à chacun.
 */
export function UserGuidePageContent() {
  const [role, setRole] = useState<GuideRole>(GUIDES[0].role);
  const guide = GUIDES.find((g) => g.role === role) ?? GUIDES[0];
  const [layouts, setLayouts] = useState<Partial<Record<GuideRole, GuideLayout>>>({});
  const layout = layouts[role];
  const [pageByRole, setPageByRole] = useState<Partial<Record<GuideRole, number>>>({});
  const page = Math.min(pageByRole[role] ?? 1, layout?.total ?? 1);
  const [printing, setPrinting] = useState(false);
  const { ref: stage, scale } = useFitScale();

  const onLayout = useCallback((l: GuideLayout) => setLayouts((current) => ({ ...current, [role]: l })), [role]);
  const goTo = useCallback(
    (n: number) => {
      if (!layout) return;
      setPageByRole((current) => ({ ...current, [role]: Math.max(1, Math.min(layout.total, n)) }));
    },
    [layout, role]
  );

  // ← / → : page précédente / suivante (hors saisie).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "ArrowRight") goTo(page + 1);
      if (event.key === "ArrowLeft") goTo(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, page]);

  // Impression : toutes les pages rendues, images chargées, puis la boîte
  // de dialogue du navigateur (« Enregistrer au format PDF »).
  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const title = document.title;
    const finish = () => {
      document.title = title;
      setPrinting(false);
    };
    (async () => {
      const images = [...document.querySelectorAll<HTMLImageElement>(".guide-print-root img")];
      await Promise.all(
        images.map((img) => (img.complete || typeof img.decode !== "function" ? undefined : img.decode().catch(() => {})))
      );
      if (cancelled) return;
      // Nom proposé pour le fichier PDF.
      document.title = `ManuShop - ${guide.title}`;
      window.addEventListener("afterprint", finish, { once: true });
      window.print();
    })();
    return () => {
      cancelled = true;
    };
  }, [printing, guide.title]);

  const currentChapter = layout
    ? layout.chapterPages.reduce((found, start, c) => (page >= start ? c : found), -1)
    : -1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Guides d&apos;utilisation</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Un guide par rôle, illustré de captures d&apos;écran de la plateforme. Feuilletez-le ici, puis exportez-le
            en PDF pour le remettre à vos utilisateurs.
          </p>
        </div>
        <div data-tour="guide-pdf" className="flex items-center gap-2">
          <Button type="button" onClick={() => setPrinting(true)} disabled={!layout || printing} className="gap-1.5">
            {printing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />}
            Exporter en PDF
          </Button>
          <CoachMark label="Aide : export PDF">
            La fenêtre d&apos;impression s&apos;ouvre : choisissez la destination « Enregistrer au format PDF ». Le
            format A4, sans marges, est déjà réglé.
          </CoachMark>
        </div>
      </div>

      <div data-tour="guide-roles" role="tablist" aria-label="Guide" className="flex flex-wrap gap-2">
        {GUIDES.map((g) => (
          <button
            key={g.role}
            type="button"
            role="tab"
            aria-selected={g.role === role}
            onClick={() => setRole(g.role)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              g.role === role
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {!layout && <MeasureLayer key={role} guide={guide} onLayout={onLayout} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav data-tour="guide-toc" aria-label="Sommaire du guide" className="flex flex-col gap-1 lg:sticky lg:top-4 lg:self-start">
          <p className="flex items-center gap-2 px-2 pb-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            <ListTree className="size-4" aria-hidden /> Sommaire
          </p>
          <button
            type="button"
            onClick={() => goTo(2)}
            className={`rounded-lg px-2 py-1.5 text-left text-sm ${page > 1 && currentChapter < 0 ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Sommaire
          </button>
          {guide.chapters.map((chapter, c) => (
            <button
              key={chapter.id}
              type="button"
              disabled={!layout}
              onClick={() => layout && goTo(layout.chapterPages[c])}
              aria-current={c === currentChapter ? "true" : undefined}
              className={`flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                c === currentChapter ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>
                {c + 1}. {chapter.title}
              </span>
              {layout && <span className="text-xs text-slate-400 tabular-nums">{layout.chapterPages[c]}</span>}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col items-center gap-4">
          <div data-tour="guide-pages" ref={stage} className="w-full">
            {layout ? (
              <div className="mx-auto" style={{ width: A4.widthPx * scale, height: A4.heightPx * scale }}>
                <div
                  className="origin-top-left shadow-xl ring-1 ring-slate-200"
                  style={{ transform: `scale(${scale})`, width: A4.widthPx, height: A4.heightPx }}
                >
                  {/* Fondu à chaque page ; à part de l'échelle, que
                      l'animation (transform) écraserait. */}
                  <div key={`${role}-${page}`} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
                    <GuideSheets guide={guide} layout={layout} version={GUIDE_VERSION} only={page} onOpenPage={goTo} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Mise en page du guide…
              </p>
            )}
          </div>

          {layout && (
            <div data-tour="guide-pagination" className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="outline" size="icon-sm" aria-label="Première page" disabled={page <= 1} onClick={() => goTo(1)}>
                <ChevronFirst className="size-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)} className="gap-1">
                <ChevronLeft className="size-4" aria-hidden /> Précédente
              </Button>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Page
                <input
                  type="number"
                  min={1}
                  max={layout.total}
                  value={page}
                  onChange={(e) => goTo(Number(e.target.value) || 1)}
                  aria-label="Numéro de page"
                  className="h-8 w-14 rounded-md border border-slate-200 bg-white px-2 text-center text-sm tabular-nums"
                />
                sur {layout.total}
              </label>
              <Button type="button" variant="outline" size="sm" disabled={page >= layout.total} onClick={() => goTo(page + 1)} className="gap-1">
                Suivante <ChevronRight className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Dernière page"
                disabled={page >= layout.total}
                onClick={() => goTo(layout.total)}
              >
                <ChevronLast className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {printing &&
        layout &&
        createPortal(
          <div className="guide-print-root">
            <GuideSheets guide={guide} layout={layout} version={GUIDE_VERSION} />
          </div>,
          document.body
        )}
    </div>
  );
}
