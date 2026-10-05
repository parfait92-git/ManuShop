/**
 * Captures d'écran du guide d'utilisation (2026-10-04).
 *
 * Prérequis, dans l'ordre :
 *   1. émulateurs : npx firebase-tools emulators:start --only auth,firestore
 *   2. données    : node scripts/guide/seed.mjs
 *   3. application branchée sur les émulateurs, en production (pas
 *      d'indicateur de développement sur les captures) :
 *        NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true npx next build --webpack
 *        NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *          FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npx next start -p 3918
 *   4. captures   : node scripts/guide/capture.mjs [id...]
 *
 * Sortie : public/guide/shots/<id>.jpg et src/content/guides/screenshots.json
 * (dimensions, lues par le guide pour mettre en page sans attendre les
 * images). Sans argument, toutes les captures ; sinon seulement celles
 * nommées. Chrome : /usr/bin/google-chrome, ou la variable CHROME_PATH.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "public/guide/shots");
const MANIFEST = join(ROOT, "src/content/guides/screenshots.json");
const BASE = process.env.GUIDE_BASE_URL ?? "http://localhost:3918";
const PASSWORD = "Guide2026!";
const FIRESTORE = "http://127.0.0.1:8080/v1/projects/manushop-eb15a/databases/(default)/documents";

const DESKTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.25 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const TOUR_IDS = [...readFileSync(join(ROOT, "src/components/onboarding/tours.ts"), "utf8").matchAll(/^\s+"?([\w-]+)"?: \[/gm)].map(
  (m) => m[1]
);

mkdirSync(OUT, { recursive: true });
mkdirSync(dirname(MANIFEST), { recursive: true });
let manifest = {};
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {}
const only = new Set(process.argv.slice(2));
const wanted = (id) => only.size === 0 || only.has(id);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", headless: true });
const sessions = new Map();

/** Contexte navigateur d'un compte (ou d'un visiteur), visites guidées vues. */
async function session(account, device) {
  const key = `${account ?? "visiteur"}-${device === PHONE ? "phone" : "desktop"}`;
  if (sessions.has(key)) return sessions.get(key);
  const context = await browser.newContext({ ...device, locale: "fr-FR", timezoneId: "Africa/Douala", acceptDownloads: true });
  await context.addInitScript((ids) => {
    try {
      localStorage.setItem("manushop:seen-tours", JSON.stringify(ids));
      sessionStorage.setItem("manushop:pwa-install-dismissed", "1");
    } catch {}
  }, TOUR_IDS);
  const page = await context.newPage();
  if (account) {
    await page.goto(`${BASE}/login`, { timeout: 120_000 });
    await page.getByLabel("Adresse email", { exact: true }).fill(account);
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90_000 });
  }
  const s = { context, page };
  sessions.set(key, s);
  return s;
}

/** Laisse les données, images et animations se poser avant la capture. */
async function settle(page, ms = 2500) {
  // Pas d'attente « réseau inactif » : les écoutes Firestore en direct
  // gardent une connexion ouverte en permanence.
  await page.waitForLoadState("load").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function save(page, id, device) {
  const path = join(OUT, `${id}.jpg`);
  await page.screenshot({ path, type: "jpeg", quality: 82 });
  const { width, height } = device.viewport;
  manifest[id] = {
    width: Math.round(width * device.deviceScaleFactor),
    height: Math.round(height * device.deviceScaleFactor),
    device: device === PHONE ? "phone" : "desktop",
  };
  console.log("✓", id);
}

async function go(page, path) {
  await page.goto(`${BASE}${path}`, { timeout: 120_000 });
  await settle(page);
}

/** Premier document Firestore d'une collection (lecture admin des émulateurs). */
async function firstDoc(collection) {
  const res = await fetch(`${FIRESTORE}/${collection}?pageSize=1`, { headers: { Authorization: "Bearer owner" } });
  const json = await res.json();
  return json.documents?.[0];
}

const SHOTS = [
  // ——— Client (téléphone) ———
  ["client-accueil", null, PHONE, async (p) => go(p, "/")],
  ["client-marche", null, PHONE, async (p) => go(p, "/catalogue")],
  ["client-boutiques", null, PHONE, async (p) => go(p, "/boutiques")],
  ["client-boutique", null, PHONE, async (p) => go(p, "/boutique/shop-maison-awa")],
  ["client-produit", null, PHONE, async (p) => go(p, "/catalogue/masque-avocat")],
  [
    "client-photo",
    null,
    PHONE,
    async (p) => {
      await go(p, "/catalogue/masque-avocat");
      await p.getByRole("button", { name: "Agrandir la photo", exact: true }).click();
      await settle(p, 1200);
    },
  ],
  ["client-connexion", null, PHONE, async (p) => go(p, "/login")],
  ["client-inscription", null, PHONE, async (p) => go(p, "/register")],
  [
    "client-panier",
    "client@guide.local",
    PHONE,
    async (p) => {
      await go(p, "/catalogue/huile-ricin");
      await p.getByRole("button", { name: "Ajouter au panier" }).click();
      await p.waitForTimeout(800);
      await go(p, "/catalogue/savon-noir");
      await p.getByRole("button", { name: "Ajouter au panier" }).click();
      await p.waitForTimeout(800);
      await p.getByRole("button", { name: "Voir le panier" }).click();
      await settle(p, 1000);
    },
  ],
  [
    "client-paiement",
    "client@guide.local",
    PHONE,
    async (p) => {
      await go(p, "/checkout/payment");
    },
  ],
  ["client-commandes", "client@guide.local", PHONE, async (p) => go(p, "/mes-commandes")],
  ["client-avis", "client@guide.local", PHONE, async (p) => go(p, "/mes-commandes/cmd-005/avis")],
  [
    "client-notifications",
    "client@guide.local",
    PHONE,
    async (p) => {
      await go(p, "/boutique/shop-maison-awa");
      await p.getByRole("button", { name: /notification/i }).first().click();
      await settle(p, 800);
    },
  ],
  ["client-favoris", "client@guide.local", PHONE, async (p) => go(p, "/mes-favoris")],
  ["client-compte", "client@guide.local", PHONE, async (p) => go(p, "/mon-compte")],
  [
    "client-facture",
    "client@guide.local",
    PHONE,
    async () => {
      // Téléchargée par l'API, comme le bouton « Facture » (l'émulation
      // téléphone de Chrome ne déclenche pas d'événement de téléchargement).
      const signIn = await fetch(
        "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulateur",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "client@guide.local", password: PASSWORD, returnSecureToken: true }),
        }
      );
      const { idToken } = await signIn.json();
      const res = await fetch(`${BASE}/api/factures/cmd-005?tz=Africa%2FDouala`, { headers: { Authorization: `Bearer ${idToken}` } });
      if (!res.ok) throw new Error(`Facture : HTTP ${res.status}`);
      const pdf = join(OUT, "_facture.pdf");
      writeFileSync(pdf, Buffer.from(await res.arrayBuffer()));
      execFileSync("pdftoppm", ["-jpeg", "-jpegopt", "quality=85", "-r", "110", "-f", "1", "-l", "1", "-singlefile", pdf, join(OUT, "client-facture")]);
      rmSync(pdf);
      // Dimensions d'une page A4 à 110 ppp.
      manifest["client-facture"] = { width: 910, height: 1286, device: "document" };
      console.log("✓ client-facture");
      return "saved";
    },
  ],
  [
    "client-verification",
    null,
    DESKTOP,
    async (p) => {
      const invoice = await firstDoc("invoices");
      const code = invoice?.fields?.verificationCode?.stringValue;
      if (!code) throw new Error("Aucune facture : capturer client-facture d'abord.");
      await go(p, `/boutique/shop-maison-awa/verifier/${code}`);
    },
  ],

  // ——— Gérant (ordinateur) ———
  [
    "gerant-creation",
    "client@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/catalogue");
      await p.getByRole("button", { name: "Mon compte" }).first().click();
      await p.getByText("Créer ma boutique", { exact: true }).click();
      await settle(p, 1000);
    },
  ],
  ["gerant-tableau", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard")],
  ["gerant-produits", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/products")],
  ["gerant-produit-nouveau", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/products/new")],
  ["gerant-produit-modifier", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/products/masque-avocat/edit")],
  [
    "gerant-stock",
    "gerant@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/dashboard/products");
      await p.getByRole("button", { name: /Gérer le stock de Beurre de karité/ }).click();
      await p.getByRole("tab", { name: "Historique" }).click();
      await settle(p, 1000);
    },
  ],
  [
    "gerant-stock-reappro",
    "gerant@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/dashboard/products");
      await p.getByRole("button", { name: /Gérer le stock de Huile de coco/ }).click();
      await p.getByRole("textbox", { name: "Quantité reçue", exact: true }).fill("12");
      await p.getByRole("textbox", { name: "Prix d'achat unitaire (FCFA)", exact: true }).fill("1800");
      await p.getByRole("textbox", { name: "Note", exact: true }).fill("Grossiste Marché Mboppi");
      await settle(p, 600);
    },
  ],
  ["gerant-categories", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/categories")],
  ["gerant-commandes", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/orders")],
  [
    "gerant-commande-manuelle",
    "gerant@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/dashboard/orders");
      await p.getByRole("button", { name: /Commande manuelle/ }).click();
      await settle(p, 800);
    },
  ],
  ["gerant-clients", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/clients")],
  ["gerant-avis", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/avis")],
  ["gerant-stats", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/stats")],
  ["gerant-rapports", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/rapports")],
  ["gerant-themes", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/themes")],
  ["gerant-parametres", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/shop")],
  [
    "gerant-facturation",
    "gerant@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/dashboard/shop");
      await p.getByText("Facturation", { exact: true }).first().scrollIntoViewIfNeeded();
      await p.evaluate(() => window.scrollBy(0, -80));
      await settle(p, 600);
    },
  ],
  ["gerant-equipe", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/team")],
  ["gerant-boutiques", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/shops")],
  ["gerant-corbeille", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/trash")],
  ["gerant-journal", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/activity")],
  ["gerant-support", "gerant@guide.local", DESKTOP, async (p) => go(p, "/dashboard/support")],

  // ——— Vendeur (ordinateur) ———
  ["vendeur-tableau", "vendeur@guide.local", DESKTOP, async (p) => go(p, "/dashboard")],
  ["vendeur-produits", "vendeur@guide.local", DESKTOP, async (p) => go(p, "/dashboard/products")],
  [
    "vendeur-stock",
    "vendeur@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/dashboard/products");
      await p.getByRole("button", { name: /Gérer le stock de Savon noir/ }).click();
      await p.getByRole("textbox", { name: "Quantité reçue", exact: true }).fill("20");
      await settle(p, 600);
    },
  ],
  ["vendeur-commandes", "vendeur@guide.local", DESKTOP, async (p) => go(p, "/dashboard/orders")],
  ["vendeur-produit-nouveau", "vendeur@guide.local", DESKTOP, async (p) => go(p, "/dashboard/products/new")],
  ["vendeur-categories", "vendeur@guide.local", DESKTOP, async (p) => go(p, "/dashboard/categories")],
  [
    "vendeur-commande-manuelle",
    "vendeur@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/dashboard/orders");
      await p.getByRole("button", { name: /Commande manuelle/ }).click();
      await p.getByRole("textbox", { name: "Nom du client", exact: true }).fill("Mme Biloa");
      await settle(p, 800);
    },
  ],
  ["vendeur-clients", "vendeur@guide.local", DESKTOP, async (p) => go(p, "/dashboard/clients")],
  ["vendeur-avis", "vendeur@guide.local", DESKTOP, async (p) => go(p, "/dashboard/avis")],
  ["vendeur-rapports", "vendeur@guide.local", DESKTOP, async (p) => go(p, "/dashboard/rapports")],

  // ——— Super Admin (ordinateur) ———
  [
    "admin-comptes",
    "admin@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/super-admin");
      await p.getByPlaceholder(/Pseudo, email ou téléphone/).fill("Christelle");
      await p.getByRole("button", { name: "Rechercher" }).click();
      await settle(p, 1200);
    },
  ],
  [
    "admin-commercants",
    "admin@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/super-admin/commercants");
      await p.getByText("Aïssatou Mbarga").first().click();
      await settle(p, 800);
    },
  ],
  ["admin-tags", "admin@guide.local", DESKTOP, async (p) => go(p, "/super-admin/tags")],
  ["admin-offres", "admin@guide.local", DESKTOP, async (p) => go(p, "/super-admin/offres-premium")],
  ["admin-messages", "admin@guide.local", DESKTOP, async (p) => go(p, "/super-admin/messages")],
  ["admin-reglages", "admin@guide.local", DESKTOP, async (p) => go(p, "/super-admin/reglages")],
  [
    "admin-guide",
    "admin@guide.local",
    DESKTOP,
    async (p) => {
      await go(p, "/super-admin/guide");
      await p.getByRole("button", { name: /Gérer le stock/ }).click();
      await settle(p, 1500);
    },
  ],
];

const failed = [];
for (const [id, account, device, prepare] of SHOTS) {
  if (!wanted(id)) continue;
  try {
    const { page } = await session(account, device);
    const result = await prepare(page, device);
    if (result !== "saved") await save(page, id, device);
    // Ferme fenêtres et panneaux laissés ouverts.
    await page.keyboard.press("Escape").catch(() => {});
  } catch (err) {
    failed.push(id);
    console.error("✗", id, "—", err.message.split("\n")[0]);
  }
}

const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
await browser.close();
if (failed.length) {
  console.error(`${failed.length} capture(s) en échec :`, failed.join(", "));
  process.exit(1);
}
