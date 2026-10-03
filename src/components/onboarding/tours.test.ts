import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { REPLAY_HINT_STEP, TOURS } from "./tours";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

const SOURCE = sourceFiles(join(process.cwd(), "src"))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

/** `data-tour="x"` en dur, ou `dataTour: "x"` (items de DashboardSidebar). */
function isTargetDeclared(target: string): boolean {
  return (
    SOURCE.includes(`data-tour="${target}"`) ||
    SOURCE.includes(`dataTour: "${target}"`)
  );
}

describe("tours", () => {
  // Une faute de frappe dans une cible ne casse rien de visible : l'étape
  // est juste retirée en silence par PageTour. Ce test l'attrape.
  it.each(Object.entries(TOURS))(
    "every target of %s is declared in the UI",
    (_tourId, steps) => {
      const missing = steps
        .map((step) => step.target)
        .filter((target) => target !== "center" && !isTargetDeclared(target));
      expect(missing).toEqual([]);
    }
  );

  it("the replay hint targets the header button", () => {
    expect(isTargetDeclared(REPLAY_HINT_STEP.target)).toBe(true);
  });

  it("every tour is mounted by at least one page, dialog or panel", () => {
    const unused = Object.keys(TOURS).filter(
      (tourId) =>
        !SOURCE.includes(`<PageTour tourId="${tourId}"`) &&
        !SOURCE.includes(`<DialogTour tourId="${tourId}"`) &&
        // Ids choisis à l'exécution (une visite par étape de
        // CreateShopWizard, `STEP_TOURS`).
        !SOURCE.includes(`"${tourId}",`)
    );
    expect(unused).toEqual([]);
  });
});
