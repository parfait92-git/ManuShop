import type { Guide } from "@/content/guides/types";

import { TOC_TITLE_KEY, blockKey, chapterKey, paginateGuide, tocKey } from "./paginate";

const guide = {
  role: "client",
  label: "Client",
  title: "Guide",
  audience: "",
  cover: "client-accueil",
  chapters: [
    {
      id: "a",
      title: "Premier",
      blocks: [
        { type: "p", text: "un" },
        { type: "h2", text: "Section A" },
        { type: "p", text: "deux" },
        { type: "p", text: "trois" },
      ],
    },
    { id: "b", title: "Second", blocks: [{ type: "p", text: "quatre" }] },
  ],
} as Guide;

function heights(values: Record<string, number>) {
  return new Map(Object.entries(values));
}

describe("paginateGuide", () => {
  it("starts each chapter on a new page and numbers pages after the cover and the table of contents", () => {
    const layout = paginateGuide(
      guide,
      heights({ [chapterKey(0)]: 20, [blockKey(0, 0)]: 10, [blockKey(0, 1)]: 5, [blockKey(0, 2)]: 10, [blockKey(0, 3)]: 10, [chapterKey(1)]: 20, [blockKey(1, 0)]: 10 }),
      100
    );

    expect(layout.tocPages).toHaveLength(1);
    expect(layout.contentPages.map((p) => p.chapter)).toEqual([0, 1]);
    // Couverture (1), sommaire (2), chapitres (3, 4).
    expect(layout.chapterPages).toEqual([3, 4]);
    expect(layout.total).toBe(4);
    expect(layout.tocPages[0].map((e) => [e.text, e.page])).toEqual([
      ["Premier", 3],
      ["Section A", 3],
      ["Second", 4],
    ]);
  });

  it("moves a block that no longer fits to the next page, keeping a heading with what follows", () => {
    // Page utile de 50 : titre 20 + « un » 10 = 30 ; « Section A » (5) + « deux » (10)
    // tiendraient (45), mais « trois » (10) déborde.
    const layout = paginateGuide(
      guide,
      heights({ [chapterKey(0)]: 20, [blockKey(0, 0)]: 10, [blockKey(0, 1)]: 5, [blockKey(0, 2)]: 10, [blockKey(0, 3)]: 10 }),
      50
    );
    expect(layout.contentPages[0].items).toHaveLength(4);
    expect(layout.contentPages[1]).toEqual({ chapter: 0, items: [{ kind: "block", chapter: 0, block: 3 }] });

    // Plus petite : l'intertitre ne reste pas seul en bas de page.
    const tight = paginateGuide(
      guide,
      heights({ [chapterKey(0)]: 20, [blockKey(0, 0)]: 10, [blockKey(0, 1)]: 5, [blockKey(0, 2)]: 10, [blockKey(0, 3)]: 10 }),
      40
    );
    expect(tight.contentPages[0].items.map((i) => (i.kind === "block" ? i.block : "titre"))).toEqual(["titre", 0]);
    expect(tight.contentPages[1].items.map((i) => (i.kind === "block" ? i.block : "titre"))).toEqual([1, 2, 3]);
  });

  it("spreads a long table of contents over several pages, shifting the content numbering", () => {
    const layout = paginateGuide(
      guide,
      heights({ [TOC_TITLE_KEY]: 30, [tocKey(0)]: 30, [tocKey(1)]: 30, [tocKey(2)]: 30 }),
      100
    );
    expect(layout.tocPages.map((page) => page.length)).toEqual([2, 1]);
    expect(layout.chapterPages).toEqual([4, 5]);
  });
});
