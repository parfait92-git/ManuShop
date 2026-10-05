import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { unwrapAction } from "@/lib/actionResult";
import { toActionResult } from "@/server/actionResult";
import { ForbiddenError, NotFoundError, UnauthenticatedError, ValidationError } from "@/server/errors";

describe("toActionResult / unwrapAction", () => {
  it("returns the data of a successful action", async () => {
    const result = await toActionResult(async () => ({ stockAfter: 4 }));
    expect(result).toEqual({ ok: true, data: { stockAfter: 4 } });
    expect(unwrapAction(result)).toEqual({ stockAfter: 4 });
  });

  it.each([
    new ValidationError("« 1 l » a encore 2 en stock."),
    new ForbiddenError("Privilège insuffisant."),
    new NotFoundError("Produit introuvable."),
    new UnauthenticatedError(),
  ])("carries an expected error's message to the client (%s)", async (error) => {
    const result = await toActionResult(async () => {
      throw error;
    });
    expect(result).toEqual({ ok: false, error: error.message });
    expect(() => unwrapAction(result)).toThrow(error.message);
  });

  it("keeps an unexpected error on the server side", async () => {
    await expect(
      toActionResult(async () => {
        throw new Error("connexion Firestore perdue");
      })
    ).rejects.toThrow("connexion Firestore perdue");
  });
});

describe("couches d'actions générées", () => {
  const dir = join(__dirname, "actions");
  const names = (source: string) => [...source.matchAll(/^export async function (\w+)\(/gm)].map((m) => m[1]);
  const modules = readdirSync(dir).filter((f) => /Actions\.ts$/.test(f));

  it.each(modules)("exposes every action of %s to the client (node scripts/generate-action-layers.mjs)", (file) => {
    const expected = names(readFileSync(join(dir, file), "utf8"));
    expect(names(readFileSync(join(dir, "results", file), "utf8"))).toEqual(expected);
    expect(names(readFileSync(join(dir, "client", file), "utf8"))).toEqual(expected);
  });

  it("never lets a service call a raw server action (its errors would lose their message)", () => {
    const services = join(__dirname, "../services");
    for (const file of readdirSync(services).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      const source = readFileSync(join(services, file), "utf8");
      expect(source).not.toMatch(/^import \{[^}]*\} from "@\/server\/actions\/\w+Actions";/m);
    }
  });
});
