/* eslint-disable @next/next/no-img-element -- les captures doivent
   s'imprimer telles quelles (PDF), à une taille fixée en millimètres : une
   simple <img>, chargée immédiatement, plutôt que next/image. */
import { BookOpen, Lightbulb, TriangleAlert } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import screenshots from "@/content/guides/screenshots.json";
import type { Guide, GuideBlock, GuideShot } from "@/content/guides/types";

import type { ContentPage, GuideLayout, TocEntry } from "./paginate";

/** Page A4, en millimètres (impression) et en pixels CSS (écran, 96 ppp). */
export const A4 = { widthMm: 210, heightMm: 297, widthPx: (210 * 96) / 25.4, heightPx: (297 * 96) / 25.4 };

/** Espace sous chaque bloc : compris dans sa hauteur mesurée. */
const BLOCK_GAP = "4mm";

/** `**gras**` → <strong>. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

/** Taille d'affichage d'une capture (mm), selon l'appareil. */
function shotSize(shot: GuideShot, inGroup: boolean): { width: number; height: number } {
  const meta = screenshots[shot.id];
  const ratio = meta.width / meta.height;
  if (meta.device === "phone") {
    const height = inGroup ? 98 : 112;
    return { width: height * ratio, height };
  }
  if (meta.device === "document") return { width: 132 * ratio, height: 132 };
  const width = Math.min(174, 112 * ratio);
  return { width, height: width / ratio };
}

function Shot({ shot, figure, inGroup = false }: { shot: GuideShot; figure: number; inGroup?: boolean }) {
  const size = shotSize(shot, inGroup);
  const meta = screenshots[shot.id];
  return (
    <figure className="flex flex-col items-center gap-[2mm]" style={{ width: inGroup ? `${size.width}mm` : undefined }}>
      <img
        src={`/guide/shots/${shot.id}.jpg`}
        alt={shot.caption}
        width={meta.width}
        height={meta.height}
        decoding="async"
        className={`block border border-slate-200 bg-slate-50 ${meta.device === "phone" ? "rounded-[3mm]" : "rounded-[1.5mm]"}`}
        style={{ width: `${size.width}mm`, height: `${size.height}mm` }}
      />
      <figcaption className="text-center text-[8.5pt] leading-snug text-slate-500">
        <span className="font-semibold text-slate-600">Figure {figure}</span> — {shot.caption}
      </figcaption>
    </figure>
  );
}

/** Numéro de la première figure de chaque bloc (numérotation continue). */
export function figureNumbers(guide: Guide): Map<string, number> {
  const numbers = new Map<string, number>();
  let n = 1;
  guide.chapters.forEach((chapter, c) =>
    chapter.blocks.forEach((block, b) => {
      if (block.type === "shot") numbers.set(`${c}-${b}`, n++);
      if (block.type === "shots") {
        numbers.set(`${c}-${b}`, n);
        n += block.shots.length;
      }
    })
  );
  return numbers;
}

export function BlockView({ block, figure }: { block: GuideBlock; figure: number }) {
  switch (block.type) {
    case "h2":
      return <h3 className="pt-[2mm] text-[13pt] font-semibold leading-tight text-slate-900">{block.text}</h3>;
    case "p":
      return (
        <p className="text-[10pt] leading-[1.55]">
          <RichText text={block.text} />
        </p>
      );
    case "steps":
      return (
        <ol className="flex flex-col gap-[1.6mm]">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-[2.5mm] text-[10pt] leading-[1.5]">
              <span className="mt-[0.3mm] flex size-[5mm] shrink-0 items-center justify-center rounded-full bg-cyan-700 text-[8pt] font-bold text-white">
                {i + 1}
              </span>
              <span>
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="flex flex-col gap-[1.2mm] pl-[1mm]">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-[2.5mm] text-[10pt] leading-[1.5]">
              <span className="mt-[2.2mm] size-[1.4mm] shrink-0 rounded-full bg-cyan-600" aria-hidden />
              <span>
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "tip": {
      const warning = block.tone === "warning";
      const Icon = warning ? TriangleAlert : Lightbulb;
      return (
        <div
          className={`flex gap-[3mm] rounded-[2mm] border-l-[1.2mm] px-[4mm] py-[3mm] text-[9.5pt] leading-[1.5] ${
            warning ? "border-amber-500 bg-amber-50 text-amber-950" : "border-cyan-600 bg-cyan-50 text-cyan-950"
          }`}
        >
          <Icon className={`mt-[0.4mm] size-[4.5mm] shrink-0 ${warning ? "text-amber-600" : "text-cyan-700"}`} aria-hidden />
          <p>
            <span className="font-semibold">{warning ? "Attention — " : "Astuce — "}</span>
            <RichText text={block.text} />
          </p>
        </div>
      );
    }
    case "shot":
      return (
        <div className="flex justify-center">
          <Shot shot={block.shot} figure={figure} />
        </div>
      );
    case "shots":
      return (
        <div className="flex items-start justify-center gap-[6mm]">
          {block.shots.map((shot, i) => (
            <Shot key={shot.id} shot={shot} figure={figure + i} inGroup />
          ))}
        </div>
      );
  }
}

/** Titre de chapitre, en tête de sa première page. */
export function ChapterHead({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex flex-col gap-[1.5mm] border-b-[0.6mm] border-cyan-600 pb-[3mm]">
      <span className="text-[8.5pt] font-semibold tracking-[0.18em] text-cyan-700 uppercase">Chapitre {number}</span>
      <h2 className="text-[20pt] leading-tight font-bold text-slate-950">{title}</h2>
    </div>
  );
}

/** Mesure : chaque élément est enveloppé avec son espacement, `data-key`. */
export function Measured({ id, gap = BLOCK_GAP, children }: { id: string; gap?: string; children: ReactNode }) {
  return (
    <div data-measure={id} style={{ paddingBottom: gap }} className="flow-root">
      {children}
    </div>
  );
}

function Sheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`guide-a4 relative flex shrink-0 flex-col overflow-hidden bg-white text-slate-700 ${className}`}
      style={{ width: `${A4.widthMm}mm`, height: `${A4.heightMm}mm` }}
    >
      {children}
    </div>
  );
}

/** Page avec en-tête et pied de page ; `main` porte la zone utile. */
export function FramedSheet({
  guide,
  heading,
  page,
  total,
  version,
  children,
  mainRef,
}: {
  guide: Guide;
  heading: string;
  page: number;
  total: number;
  version: string;
  children?: ReactNode;
  mainRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <Sheet>
      <div className="flex h-full flex-col px-[18mm] pt-[12mm] pb-[10mm]">
        <header className="flex h-[8mm] shrink-0 items-end justify-between gap-[6mm] border-b border-slate-200 pb-[2mm] text-[8pt] text-slate-500">
          <span className="font-semibold">
            Manu<span className="text-cyan-600">Shop</span> · {guide.title}
          </span>
          <span className="truncate">{heading}</span>
        </header>
        <div ref={mainRef} className="min-h-0 flex-1 overflow-hidden pt-[6mm]">
          {children}
        </div>
        <footer className="flex h-[7mm] shrink-0 items-end justify-between border-t border-slate-200 pt-[2mm] text-[8pt] text-slate-500">
          <span>{version}</span>
          <span>
            Page {page} / {total}
          </span>
        </footer>
      </div>
    </Sheet>
  );
}

export function CoverSheet({ guide, version }: { guide: Guide; version: string }) {
  const meta = screenshots[guide.cover];
  const phone = meta.device === "phone";
  return (
    <Sheet>
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-[5mm] bg-slate-950 px-[18mm] pt-[22mm] pb-[16mm] text-white">
          <div className="flex items-center gap-[3mm]">
            <span className="flex size-[10mm] items-center justify-center rounded-full bg-cyan-500/20">
              <BookOpen className="size-[5mm] text-cyan-300" aria-hidden />
            </span>
            <span className="text-[14pt] font-semibold tracking-tight">
              Manu<span className="text-cyan-400">Shop</span>
            </span>
          </div>
          <p className="text-[10pt] font-semibold tracking-[0.2em] text-cyan-300 uppercase">Guide d&apos;utilisation</p>
          <h1 className="text-[28pt] leading-[1.1] font-bold">{guide.title}</h1>
          <p className="max-w-[150mm] text-[11pt] leading-[1.5] text-slate-300">{guide.audience}</p>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 px-[18mm] py-[10mm]">
          <img
            src={`/guide/shots/${guide.cover}.jpg`}
            alt=""
            width={meta.width}
            height={meta.height}
            className="max-h-full rounded-[2mm] border border-slate-200 shadow-xl"
            style={phone ? { height: "120mm", width: "auto" } : { width: "174mm", height: "auto" }}
          />
        </div>
        <div className="flex items-center justify-between px-[18mm] py-[8mm] text-[9pt] text-slate-500">
          <span>{version}</span>
          <span>Des commerces locaux, une expérience unique.</span>
        </div>
      </div>
    </Sheet>
  );
}

export function TocTitle() {
  return <h2 className="text-[20pt] font-bold text-slate-950">Sommaire</h2>;
}

export function TocLine({ entry, page }: { entry: Omit<TocEntry, "page">; page?: number }) {
  const main = entry.level === 1;
  return (
    <div className={`flex items-baseline gap-[2mm] ${main ? "pt-[2.5mm] text-[11pt] font-semibold text-slate-900" : "pl-[6mm] text-[9.5pt] text-slate-600"}`}>
      <span>{entry.text}</span>
      <span className="min-w-[6mm] flex-1 translate-y-[-0.6mm] border-b border-dotted border-slate-300" aria-hidden />
      <span className="tabular-nums">{page ?? "00"}</span>
    </div>
  );
}

export function TocSheet({
  guide,
  entries,
  first,
  page,
  total,
  version,
  onOpenPage,
}: {
  guide: Guide;
  entries: TocEntry[];
  first: boolean;
  page: number;
  total: number;
  version: string;
  onOpenPage?: (page: number) => void;
}) {
  return (
    <FramedSheet guide={guide} heading="Sommaire" page={page} total={total} version={version}>
      {first && (
        <div style={{ paddingBottom: BLOCK_GAP }}>
          <TocTitle />
        </div>
      )}
      {entries.map((entry, i) =>
        onOpenPage ? (
          <button
            key={i}
            type="button"
            onClick={() => onOpenPage(entry.page)}
            className="block w-full text-left hover:text-cyan-700 [&_*]:hover:text-cyan-700"
          >
            <TocLine entry={entry} page={entry.page} />
          </button>
        ) : (
          <TocLine key={i} entry={entry} page={entry.page} />
        )
      )}
    </FramedSheet>
  );
}

export function ContentSheet({
  guide,
  content,
  figures,
  page,
  total,
  version,
}: {
  guide: Guide;
  content: ContentPage;
  figures: Map<string, number>;
  page: number;
  total: number;
  version: string;
}) {
  const chapter = guide.chapters[content.chapter];
  return (
    <FramedSheet guide={guide} heading={`${content.chapter + 1}. ${chapter.title}`} page={page} total={total} version={version}>
      {content.items.map((item) =>
        item.kind === "chapter" ? (
          <div key="head" style={{ paddingBottom: "6mm" }}>
            <ChapterHead number={item.chapter + 1} title={chapter.title} />
          </div>
        ) : (
          <div key={item.block} style={{ paddingBottom: BLOCK_GAP }} className="flow-root">
            <BlockView block={chapter.blocks[item.block]} figure={figures.get(`${item.chapter}-${item.block}`) ?? 0} />
          </div>
        )
      )}
    </FramedSheet>
  );
}

/** Toutes les pages d'un guide, dans l'ordre (impression, aperçu). */
export function GuideSheets({
  guide,
  layout,
  version,
  only,
  onOpenPage,
}: {
  guide: Guide;
  layout: GuideLayout;
  version: string;
  /** Une seule page (numéro), sinon toutes. */
  only?: number;
  onOpenPage?: (page: number) => void;
}) {
  const figures = figureNumbers(guide);
  const tocCount = layout.tocPages.length;
  const pages: ReactNode[] = [];
  const show = (n: number) => only === undefined || only === n;
  if (show(1)) pages.push(<CoverSheet key="cover" guide={guide} version={version} />);
  layout.tocPages.forEach((entries, i) => {
    const n = 2 + i;
    if (show(n))
      pages.push(
        <TocSheet key={`toc-${i}`} guide={guide} entries={entries} first={i === 0} page={n} total={layout.total} version={version} onOpenPage={onOpenPage} />
      );
  });
  layout.contentPages.forEach((content, i) => {
    const n = 2 + tocCount + i;
    if (show(n))
      pages.push(
        <ContentSheet key={`p-${i}`} guide={guide} content={content} figures={figures} page={n} total={layout.total} version={version} />
      );
  });
  return <>{pages}</>;
}
