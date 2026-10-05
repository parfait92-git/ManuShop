import { existsSync } from "fs";
import { join } from "path";

import { GUIDES } from "@/content/guides";
import screenshots from "@/content/guides/screenshots.json";

const shotFile = (id: string) => join(__dirname, "../../../public/guide/shots", `${id}.jpg`);

describe("guides d'utilisation", () => {
  it("has one guide per role", () => {
    expect(GUIDES.map((g) => g.role).sort()).toEqual(["client", "gerant", "super-admin", "vendeur"]);
  });

  it("only shows screenshots that were actually captured", () => {
    const used = GUIDES.flatMap((g) => [
      g.cover,
      ...g.chapters.flatMap((c) =>
        c.blocks.flatMap((b) => (b.type === "shot" ? [b.shot.id] : b.type === "shots" ? b.shots.map((s) => s.id) : []))
      ),
    ]);
    for (const id of used) {
      expect(screenshots).toHaveProperty(id);
      expect(existsSync(shotFile(id))).toBe(true);
    }
  });

  it("gives every chapter a unique id and some content", () => {
    for (const guide of GUIDES) {
      const ids = guide.chapters.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      guide.chapters.forEach((c) => expect(c.blocks.length).toBeGreaterThan(0));
    }
  });

  it("closes every **bold** marker", () => {
    for (const guide of GUIDES)
      for (const chapter of guide.chapters)
        for (const block of chapter.blocks) {
          const texts = "text" in block ? [block.text] : "items" in block ? block.items : [];
          texts.forEach((t) => expect((t.match(/\*\*/g) ?? []).length % 2).toBe(0));
        }
  });
});
