/**
 * Données de démonstration du guide d'utilisation (2026-10-04).
 *
 * À lancer UNIQUEMENT contre les émulateurs Firebase (jamais la base
 * réelle) : la boutique fictive « Maison Awa Cosmétiques », ses produits,
 * commandes, avis, clients, un vendeur, un Super Admin et deux autres
 * boutiques, pour des captures d'écran réalistes.
 *
 *   node scripts/guide/seed.mjs
 *
 * Comptes (mot de passe « Guide2026! ») :
 *   gerant@guide.local   — gérante de la boutique
 *   vendeur@guide.local  — vendeur de la boutique
 *   client@guide.local   — cliente
 *   admin@guide.local    — Super Admin
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Avant tout appel Firebase : les SDK lisent ces variables à l'usage.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
if (!/^(127\.0\.0\.1|localhost):/.test(process.env.FIRESTORE_EMULATOR_HOST)) {
  throw new Error("Ce script ne s'exécute que contre les émulateurs Firebase.");
}

initializeApp({ projectId: process.env.GCLOUD_PROJECT || "manushop-eb15a" });
const db = getFirestore();
const auth = getAuth();

const PASSWORD = "Guide2026!";
const SHOP = "shop-maison-awa";
const DAY = 86_400_000;
const NOW = Date.now();
/** Il y a `daysAgo` jours, à `hour`:`minute` heure de Douala (UTC+1),
 * quel que soit le fuseau de la machine qui lance le script. */
const at = (daysAgo, hour = 10, minute = 0) => {
  const d = new Date(NOW + 3_600_000 - daysAgo * DAY);
  d.setUTCHours(hour - 1, minute, 0, 0);
  return Timestamp.fromDate(d);
};
const img = (name) => `/guide/demo/${name}.png`;

/** Toutes les visites guidées marquées « déjà vues » : aucune bulle sur les captures. */
const TOUR_IDS = [
  ...readFileSync(join(__dirname, "../../src/components/onboarding/tours.ts"), "utf8").matchAll(/^\s+"?([\w-]+)"?: \[/gm),
].map((m) => m[1]);

async function user(email, displayName, extra) {
  const { uid } = await auth.createUser({ email, password: PASSWORD, displayName });
  await db.doc(`users/${uid}`).set({
    email,
    displayName,
    seenTours: TOUR_IDS,
    createdAt: at(120),
    ...extra,
  });
  return uid;
}

const PRODUCTS = [
  { id: "huile-ricin", name: "Huile de ricin pure 100 ml", category: "Soins cheveux", price: 3500, cost: 2000, stock: 24, threshold: 5, description: "Huile de ricin pressée à froid, sans additif. Fortifie les cheveux, les cils et les sourcils." },
  { id: "beurre-karite", name: "Beurre de karité brut 250 g", category: "Soins du corps", price: 2500, cost: 1300, stock: 3, threshold: 5, description: "Karité non raffiné du Nord-Cameroun. Nourrit et protège la peau sèche." },
  { id: "savon-noir", name: "Savon noir africain", category: "Savons", price: 1500, cost: 700, stock: 40, threshold: 10, description: "Savon artisanal à l'huile de palme et au cacao. Nettoie en douceur visage et corps." },
  {
    id: "lait-corporel", name: "Lait corporel au karité", category: "Soins du corps", price: 4500, cost: 2600, stock: 12, threshold: 4,
    description: "Lait hydratant léger au karité et à l'aloe vera, pénètre vite.",
    // Deux versions (BF-17) : le stock du produit est leur total.
    variantName: "Contenance",
    variants: { v200: { label: "200 ml", stock: 5, price: 2500, position: 0 }, v400: { label: "400 ml", stock: 7, position: 1 } },
  },
  { id: "huile-coco", name: "Huile de coco vierge 250 ml", category: "Soins cheveux", price: 3000, cost: 1800, stock: 0, threshold: 4, description: "Huile de coco vierge pour cheveux et peau, au parfum naturel." },
  { id: "masque-avocat", name: "Masque capillaire à l'avocat", category: "Soins cheveux", price: 5000, cost: 2900, stock: 9, threshold: 3, description: "Masque nourrissant à l'avocat et au miel pour cheveux secs et crépus.", promoPrice: 4000 },
  { id: "gommage-cafe", name: "Gommage au café 200 g", category: "Soins du corps", price: 2800, cost: 1200, stock: 15, threshold: 4, description: "Gommage exfoliant au café et au sucre de canne." },
  { id: "trousse-wax", name: "Trousse de toilette en pagne wax", category: "Accessoires", price: 6000, cost: 3500, stock: 6, threshold: 2, description: "Trousse cousue main à Douala, doublure imperméable." },
];

const CLIENTS = [
  ["Christelle Ngo", "+237690112233", "Bonapriso, Douala"],
  ["Fatou Ndiaye", "+237677456789", "Bastos, Yaoundé"],
  ["Jean-Paul Mbarga", "+237699887766", "Akwa, Douala"],
  ["Aminata Bello", "+237655123456", "Garoua centre"],
  ["Brice Kamga", "+237670987654", "Bafoussam"],
  ["Grâce Etoundi", "+237691234567", "Kribi"],
];

async function main() {
  const gerant = await user("gerant@guide.local", "Aïssatou Mbarga", { role: "admin", shopId: SHOP, phone: "+237690000001", adminSource: "subscription" });
  const vendeur = await user("vendeur@guide.local", "Junior Tchoupo", { role: "seller", shopId: SHOP, phone: "+237690000002" });
  const client = await user("client@guide.local", "Christelle Ngo", {
    role: "client",
    phone: "+237690112233",
    deliveryAddress: "Bonapriso, Douala",
    favoriteProductIds: ["huile-ricin", "masque-avocat"],
  });
  await user("admin@guide.local", "Équipe ManuShop", { role: "client" });
  await db.doc("platformAdmins/admin@guide.local").set({ email: "admin@guide.local", role: "super-admin", addedAt: at(200) });

  // Autres commerçants (liste du Super Admin, Marché).
  const kamer = await user("kamer@guide.local", "Paul Nkeng", { role: "admin", shopId: "shop-kamer-mode" });
  const saveurs = await user("saveurs@guide.local", "Mariam Oumarou", { role: "admin", shopId: "shop-saveurs-nord" });

  await db.doc(`shops/${SHOP}`).set({
    name: "Maison Awa Cosmétiques",
    logo: img("logo-maison-awa"),
    description: "Cosmétiques naturels faits au Cameroun : karité, huiles, savons et accessoires en wax.",
    address: "Rue Joss, Bonanjo, Douala",
    phone: "+237690000001",
    whatsapp: "+237690000001",
    currency: "XAF",
    ownerId: gerant,
    sector: "Cosmétique",
    adminSource: "subscription",
    subscriptionPlan: "yearly",
    subscriptionExpiresAt: Timestamp.fromDate(new Date(NOW + 300 * DAY)),
    isPublished: true,
    primarySocialNetwork: "instagram",
    instagramUrl: "https://instagram.com/maisonawa",
    facebookUrl: "https://facebook.com/maisonawa",
    premiumFeatures: ["advancedContact", "socialFooterLinks", "contactForm"],
    clientContactMethods: ["whatsapp", "instagram"],
    themeColor: "#7A3A2A",
    vatRate: 0,
    taxId: "M012345678901A",
    soundOnNewOrder: true,
    soundOnOrderStatusChange: true,
    soundOnNewMessage: true,
    createdAt: at(150),
  });
  await db.doc(`shops/${SHOP}/themes/active`).set({ themeId: "default", appliedAt: at(140), appliedBy: gerant });
  for (const [id, name, owner, sector] of [
    ["shop-kamer-mode", "Kamer Mode", kamer, "Mode"],
    ["shop-saveurs-nord", "Saveurs du Nord", saveurs, "Alimentation"],
  ]) {
    await db.doc(`shops/${id}`).set({
      name, logo: "", address: "Yaoundé", phone: "+237690000009", whatsapp: "", currency: "XAF",
      ownerId: owner, sector, isPublished: true, subscriptionPlan: "monthly", adminSource: "subscription",
      subscriptionExpiresAt: Timestamp.fromDate(new Date(NOW + 20 * DAY)), createdAt: at(90),
    });
  }

  // Tags système et catégories.
  const tags = [["beaute", "Beauté", "#DB2777"], ["mode", "Mode", "#7C3AED"], ["alimentation", "Alimentation", "#16A34A"], ["maison", "Maison", "#0891B2"]];
  for (const [id, name, color] of tags) await db.doc(`categoryTags/${id}`).set({ name, color, createdAt: at(200) });
  const categories = [["Soins cheveux", "beaute"], ["Soins du corps", "beaute"], ["Savons", "beaute"], ["Accessoires", "mode"]];
  for (const [i, [name, tagId]] of categories.entries()) {
    await db.doc(`categories/cat-${i}`).set({ shopId: SHOP, name, tagId, isActive: true, description: "", createdAt: at(149) });
  }
  await db.doc("categories/cat-brouillon").set({ shopId: SHOP, name: "Coffrets cadeaux", isActive: false, createdAt: at(10) });

  for (const p of PRODUCTS) {
    await db.doc(`products/${p.id}`).set({
      shopId: SHOP, name: p.name, description: p.description, price: p.price, category: p.category,
      images: [img(p.id)], stock: p.stock, stockThreshold: p.threshold,
      isPromo: !!p.promoPrice, ...(p.promoPrice ? { promoPrice: p.promoPrice } : {}),
      ...(p.variants ? { variants: p.variants, variantName: p.variantName } : {}),
      isPublished: true, createdAt: at(148), updatedAt: at(2),
    });
    await db.doc(`productCosts/${p.id}`).set({ shopId: SHOP, purchasePrice: p.cost, updatedAt: at(148) });
    await db.collection("stockMovements").add({
      shopId: SHOP, productId: p.id, productName: p.name, type: "initial", quantity: p.stock + 10, stockAfter: p.stock + 10,
      actorId: gerant, actorName: "Aïssatou Mbarga", createdAt: at(3, 9),
    });
  }
  await db.collection("stockMovements").add({
    shopId: SHOP, productId: "beurre-karite", productName: PRODUCTS[1].name, type: "restock", quantity: 20, stockAfter: 23,
    note: "Coopérative de Ngaoundéré", actorId: vendeur, actorName: "Junior Tchoupo", createdAt: at(2, 11),
  });
  await db.collection("stockMovements").add({
    shopId: SHOP, productId: "beurre-karite", productName: PRODUCTS[1].name, type: "adjustment", quantity: -2, stockAfter: 21,
    note: "2 pots abîmés au transport", actorId: gerant, actorName: "Aïssatou Mbarga", createdAt: at(1, 17),
  });

  // Commandes réparties sur trois mois, la plupart livrées.
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const plan = [
    // [jours, client, statut, [[produit, qté]...]]
    [0, 0, "under_review", [["masque-avocat", 1], ["huile-ricin", 2]]],
    [0, 3, "under_review", [["savon-noir", 3]]],
    [1, 1, "ready_for_delivery", [["lait-corporel", 1], ["beurre-karite", 2]]],
    [1, 0, "delivering", [["trousse-wax", 1]]],
    [3, 0, "delivered", [["huile-ricin", 1], ["beurre-karite", 1], ["savon-noir", 2]]],
    [4, 2, "delivered", [["gommage-cafe", 2]]],
    [6, 4, "cancelled", [["huile-coco", 2]]],
    [8, 5, "delivered", [["lait-corporel", 2], ["savon-noir", 1]]],
    [12, 1, "returned", [["trousse-wax", 1]]],
    [15, 2, "delivered", [["huile-ricin", 3]]],
    [19, 3, "delivered", [["masque-avocat", 1], ["huile-coco", 1]]],
    [24, 0, "delivered", [["beurre-karite", 2], ["gommage-cafe", 1]]],
    [31, 4, "delivered", [["savon-noir", 4]]],
    [38, 5, "delivered", [["trousse-wax", 2]]],
    [44, 1, "delivered", [["lait-corporel", 1]]],
    [52, 2, "delivered", [["huile-coco", 2], ["huile-ricin", 1]]],
    [60, 3, "delivered", [["masque-avocat", 2]]],
    [68, 0, "delivered", [["savon-noir", 2], ["beurre-karite", 1]]],
    [75, 4, "delivered", [["gommage-cafe", 3]]],
  ];
  for (const [i, [days, c, status, lines]] of plan.entries()) {
    const [clientName, clientPhone, clientAddress] = CLIENTS[c];
    const items = lines.map(([pid, quantity]) => ({ productId: pid, name: byId[pid].name, quantity, unitPrice: byId[pid].price }));
    const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const id = `cmd-${String(i + 1).padStart(3, "0")}`;
    await db.doc(`orders/${id}`).set({
      shopId: SHOP, ...(c === 0 ? { clientId: client } : {}), clientName, clientPhone, clientAddress, items,
      subtotal: total, discount: 0, total, status, notes: "",
      ...(status === "cancelled" ? { cancelReason: "Je me suis trompée d'article" } : {}),
      ...(status === "returned" ? { returnReason: "Couleur différente de la photo" } : {}),
      createdAt: at(days, 9 + (i % 8), (i * 7) % 60), updatedAt: at(Math.max(days - 1, 0), 15),
    });
    await db.doc(`orderCosts/${id}`).set({
      shopId: SHOP, items: items.map((it) => ({ productId: it.productId, unitCost: byId[it.productId].cost })), createdAt: at(days),
    });
  }

  // Avis : livraison (privé) et articles (publics), avec réponses.
  await db.doc("orderFeedback/cmd-005").set({
    orderId: "cmd-005", shopId: SHOP, clientId: client, clientName: "Christelle Ngo", rating: 5,
    comment: "Livrée le lendemain, livreur très aimable.",
    reply: { text: "Merci Christelle, à très bientôt !", authorName: "Maison Awa Cosmétiques", repliedAt: at(2, 18) },
    createdAt: at(2, 16),
  });
  const reviews = [
    ["huile-ricin", "cmd-005", client, 5, "Mes cheveux poussent vraiment mieux, je recommande.", "Merci pour votre confiance !"],
    ["savon-noir", "cmd-005", client, 4, "Très doux, l'odeur est naturelle.", null],
    ["gommage-cafe", "cmd-006", "client-2", 5, "La peau est toute douce après.", null],
    ["lait-corporel", "cmd-008", "client-5", 4, "Bonne texture, pénètre vite.", null],
  ];
  for (const [i, [productId, orderId, authorId, rating, comment, reply]] of reviews.entries()) {
    await db.doc(`reviews/rev-${i}`).set({
      productId, shopId: SHOP, orderId, authorId, rating, comment,
      ...(reply ? { reply: { text: reply, authorName: "Maison Awa Cosmétiques", repliedAt: at(1, 19) } } : {}),
      createdAt: at(2 + i, 12),
    });
  }
  await db.collection("notifications").add({
    userId: client, type: "review_reply", orderId: "cmd-005", shopId: SHOP, read: false,
    message: "Maison Awa Cosmétiques a répondu à votre avis.", link: "/mes-commandes/cmd-005/avis", createdAt: at(1, 19),
  });

  // Journal d'activité.
  for (const [i, [action, targetType, targetId, metadata]] of [
    ["order.status_changed", "order", "cmd-004", { status: "delivering" }],
    ["product.published", "product", "masque-avocat", { productName: PRODUCTS[5].name }],
    ["order.cancelled", "order", "cmd-007", { reason: "Je me suis trompée d'article" }],
    ["shop.settings_updated", "shop", SHOP, undefined],
  ].entries()) {
    await db.collection("activityLog").add({
      shopId: SHOP, actorId: gerant, actorName: "Aïssatou Mbarga", action, targetType, targetId,
      ...(metadata ? { metadata } : {}), createdAt: at(i, 14),
    });
  }

  // Super Admin : messages, demande premium, réglages.
  await db.collection("supportMessages").add({
    shopId: SHOP, shopName: "Maison Awa Cosmétiques", senderId: gerant, senderName: "Aïssatou Mbarga",
    subject: "Paiement du thème « Or Lumière »", body: "Bonjour, j'ai envoyé le paiement par Orange Money ce matin. Pouvez-vous activer le thème ?",
    status: "open", createdAt: at(0, 9),
  });
  await db.collection("supportMessages").add({
    shopId: SHOP, shopName: "Maison Awa Cosmétiques", senderId: gerant, senderName: "Aïssatou Mbarga",
    subject: "Ajouter un vendeur", body: "Comment inviter mon vendeur à gérer la boutique ?",
    status: "answered", reply: { body: "Depuis le menu Équipe : saisissez son adresse e-mail, il recevra l'accès.", createdAt: at(5, 11) },
    createdAt: at(6, 10),
  });
  await db.collection("premiumRequests").add({
    shopId: SHOP, shopName: "Maison Awa Cosmétiques", itemKey: "theme:or-lumiere", itemLabel: "Thème « Or Lumière »",
    priceFcfa: 5000, status: "pending", requestedBy: gerant, requestedByName: "Aïssatou Mbarga", createdAt: at(0, 8),
  });
  // Domaine officiel : les captures n'affichent jamais « localhost ».
  await db.doc("configuration/general").set({ demoCatalogueEnabled: false, siteUrl: "https://manu-shop.vercel.app" }, { merge: true });

  console.log("Données du guide créées :", { gerant, vendeur, client });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
