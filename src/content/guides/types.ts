import type screenshots from "./screenshots.json";

/** Capture d'écran existante (`public/guide/shots/<id>.jpg`), produite par
 * `scripts/guide/capture.mjs` : une faute de frappe ne compile pas. */
export type ShotId = keyof typeof screenshots;

export type GuideRole = "client" | "vendeur" | "gerant" | "super-admin";

export interface GuideShot {
  id: ShotId;
  caption: string;
}

/**
 * Bloc de contenu d'un guide. Le texte accepte `**gras**`. Les blocs sont
 * répartis automatiquement sur des pages A4 (`paginateGuide`) : un bloc
 * n'est jamais coupé entre deux pages, un intertitre reste avec la suite.
 */
export type GuideBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "shot"; shot: GuideShot }
  /** Deux ou trois captures de téléphone côte à côte. */
  | { type: "shots"; shots: GuideShot[] }
  | { type: "tip"; tone?: "tip" | "warning"; text: string };

export interface GuideChapter {
  id: string;
  title: string;
  blocks: GuideBlock[];
}

export interface Guide {
  role: GuideRole;
  /** Onglet de la page, ex. « Gérant ». */
  label: string;
  /** Titre de la couverture, ex. « Guide du gérant de boutique ». */
  title: string;
  /** Pour qui, en une phrase (couverture). */
  audience: string;
  /** Capture mise en avant sur la couverture. */
  cover: ShotId;
  chapters: GuideChapter[];
}
