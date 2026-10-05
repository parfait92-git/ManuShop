import type { Guide, GuideBlock } from "@/content/guides/types";

/** Élément placé sur une page de contenu. */
export type PageItem =
  | { kind: "chapter"; chapter: number }
  | { kind: "block"; chapter: number; block: number };

export interface ContentPage {
  /** Chapitre en cours (en-tête de page). */
  chapter: number;
  items: PageItem[];
}

export interface TocEntry {
  level: 1 | 2;
  text: string;
  chapter: number;
  /** Numéro de page dans le document complet (couverture = 1). */
  page: number;
}

export interface GuideLayout {
  tocPages: TocEntry[][];
  contentPages: ContentPage[];
  /** Pages au total : couverture + sommaire + contenu. */
  total: number;
  /** Premier numéro de page de chaque chapitre. */
  chapterPages: number[];
}

/** Hauteurs mesurées (en px), dans l'ordre de `measureKeys`. */
export type Heights = Map<string, number>;

export const chapterKey = (chapter: number) => `c${chapter}`;
export const blockKey = (chapter: number, block: number) => `c${chapter}b${block}`;
export const tocKey = (index: number) => `t${index}`;
export const TOC_TITLE_KEY = "toc-title";

/** Entrées du sommaire, sans numéros de page : chapitres et intertitres. */
export function tocEntries(guide: Guide): Omit<TocEntry, "page">[] {
  return guide.chapters.flatMap((chapter, c) => [
    { level: 1 as const, text: chapter.title, chapter: c },
    ...chapter.blocks
      .filter((b): b is Extract<GuideBlock, { type: "h2" }> => b.type === "h2")
      .map((b) => ({ level: 2 as const, text: b.text, chapter: c })),
  ]);
}

/**
 * Répartit un guide sur des pages A4 à partir des hauteurs mesurées :
 * chaque chapitre commence une page ; un bloc qui ne tient plus passe à la
 * page suivante ; un intertitre n'est jamais laissé seul en bas de page.
 * `available` : hauteur utile d'une page (px).
 */
export function paginateGuide(guide: Guide, heights: Heights, available: number): GuideLayout {
  const h = (key: string) => heights.get(key) ?? 0;

  // Contenu.
  const contentPages: ContentPage[] = [];
  const blockPage = new Map<string, number>();
  guide.chapters.forEach((chapter, c) => {
    let page: ContentPage = { chapter: c, items: [{ kind: "chapter", chapter: c }] };
    let used = h(chapterKey(c));
    contentPages.push(page);
    chapter.blocks.forEach((block, b) => {
      let need = h(blockKey(c, b));
      // Intertitre : il part avec le bloc qui le suit.
      if (block.type === "h2" && b + 1 < chapter.blocks.length) need += h(blockKey(c, b + 1));
      if (used + need > available && page.items.length > 0 && used > 0) {
        page = { chapter: c, items: [] };
        used = 0;
        contentPages.push(page);
      }
      page.items.push({ kind: "block", chapter: c, block: b });
      blockPage.set(blockKey(c, b), contentPages.length - 1);
      used += h(blockKey(c, b));
    });
  });

  // Sommaire : son nombre de pages décale la numérotation du contenu.
  const entries = tocEntries(guide);
  const tocChunks: number[][] = [[]];
  let used = h(TOC_TITLE_KEY);
  entries.forEach((_, i) => {
    if (used + h(tocKey(i)) > available && tocChunks[tocChunks.length - 1].length > 0) {
      tocChunks.push([]);
      used = 0;
    }
    tocChunks[tocChunks.length - 1].push(i);
    used += h(tocKey(i));
  });
  const firstContentPage = 2 + tocChunks.length;

  const chapterPages = guide.chapters.map(
    (_, c) => firstContentPage + contentPages.findIndex((p) => p.items.some((it) => it.kind === "chapter" && it.chapter === c))
  );
  // Page d'un intertitre : retrouvée par son rang parmi les h2 du chapitre.
  const sectionPages = guide.chapters.map((chapter, c) =>
    chapter.blocks.flatMap((block, b) => (block.type === "h2" ? [firstContentPage + (blockPage.get(blockKey(c, b)) ?? 0)] : []))
  );
  const seen = new Map<number, number>();
  const withPages: TocEntry[] = entries.map((entry) => {
    if (entry.level === 1) return { ...entry, page: chapterPages[entry.chapter] };
    const n = seen.get(entry.chapter) ?? 0;
    seen.set(entry.chapter, n + 1);
    return { ...entry, page: sectionPages[entry.chapter][n] };
  });

  return {
    tocPages: tocChunks.map((chunk) => chunk.map((i) => withPages[i])),
    contentPages,
    total: firstContentPage - 1 + contentPages.length,
    chapterPages,
  };
}
