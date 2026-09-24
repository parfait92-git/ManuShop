import { Timestamp } from "firebase/firestore";

import type { Category } from "@/models/category/Category";
import type { Product } from "@/models/product/Product";
import type { Shop } from "@/models/shop/Shop";
import type { User } from "@/models/user/User";

/**
 * Données de démo pour le catalogue multi-boutiques, le tableau de bord
 * admin et la page Super Admin — jamais lues depuis Firestore, uniquement
 * pour prototyper/présenter l'UI sans backend réel.
 *
 * Réutilise directement les types du domaine (`Shop`, `Product`, `Category`,
 * `User`) plutôt que d'en redéfinir des équivalents : ils couvrent déjà
 * exactement les champs lus par les pages réelles (vérifié en lisant
 * `ProductList`, `CategoryManager`, `TeamList`, `SuperAdminPanel` et
 * `ShopSettingsForm` avant d'écrire ce fichier — pas de champ inventé qui ne
 * serait consommé nulle part). `MockShop` étend `Shop` avec `sector`, le
 * seul champ demandé qui n'existe pas encore sur le vrai modèle (aucune
 * boutique réelle n'a de secteur d'activité aujourd'hui) — pas ajouté à
 * `src/models/shop/Shop.ts` pour ne pas toucher au modèle réel pour un
 * besoin qui n'est que de la démo.
 */
export interface MockShop extends Shop {
  sector: string;
}

function timestampDaysAgo(days: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

function shopImage(id: string): string {
  return `https://picsum.photos/seed/${id}/400/300`;
}

function articleImage(id: string): string {
  return `https://picsum.photos/seed/${id}/500/500`;
}

export const mockShops: MockShop[] = [
  {
    id: "shop-laiterie-wouri",
    name: "Laiterie du Wouri",
    sector: "Produits laitiers",
    logo: shopImage("shop-laiterie-wouri"),
    address: "Douala, Cameroun",
    phone: "+237690000001",
    whatsapp: "+237690000001",
    currency: "XAF",
    ownerId: "owner-laiterie-wouri",
    createdAt: timestampDaysAgo(240),
  },
  {
    id: "shop-embacam",
    name: "EmbaCam Solutions",
    sector: "Emballages",
    logo: shopImage("shop-embacam"),
    address: "Yaoundé, Cameroun",
    phone: "+237690000002",
    whatsapp: "+237690000002",
    currency: "XAF",
    ownerId: "owner-embacam",
    createdAt: timestampDaysAgo(200),
  },
  {
    id: "shop-aromes-saveurs",
    name: "Arômes & Saveurs",
    sector: "Arômes et épices",
    logo: shopImage("shop-aromes-saveurs"),
    address: "Bafoussam, Cameroun",
    phone: "+237690000003",
    whatsapp: "+237690000003",
    currency: "XAF",
    ownerId: "owner-aromes-saveurs",
    createdAt: timestampDaysAgo(150),
  },
  {
    id: "shop-mode-237",
    name: "Mode 237",
    sector: "Vêtements",
    logo: shopImage("shop-mode-237"),
    address: "Douala, Cameroun",
    phone: "+237690000004",
    whatsapp: "+237690000004",
    currency: "XAF",
    ownerId: "owner-mode-237",
    createdAt: timestampDaysAgo(90),
  },
  {
    id: "shop-techpoint",
    name: "TechPoint Cameroun",
    sector: "Électronique",
    logo: shopImage("shop-techpoint"),
    address: "Yaoundé, Cameroun",
    phone: "+237690000005",
    whatsapp: "+237690000005",
    currency: "XAF",
    ownerId: "owner-techpoint",
    createdAt: timestampDaysAgo(60),
  },
  {
    id: "shop-beaute-naturelle",
    name: "Beauté Naturelle",
    sector: "Cosmétiques",
    logo: shopImage("shop-beaute-naturelle"),
    address: "Limbe, Cameroun",
    phone: "+237690000006",
    whatsapp: "+237690000006",
    currency: "XAF",
    ownerId: "owner-beaute-naturelle",
    createdAt: timestampDaysAgo(30),
  },
];

/**
 * Catégories par boutique — 2 par boutique (une de plus pour Mode 237), avec
 * des noms qui correspondent EXACTEMENT à `mockArticles[].category`
 * ci-dessous : `ProductList` filtre les produits par
 * `product.category === category.name` (vérifié dans le code réel), donc un
 * écart de libellé casserait silencieusement ce filtre en démo.
 */
export const mockCategories: Category[] = [
  {
    id: "category-laiterie-lait-yaourts",
    shopId: "shop-laiterie-wouri",
    name: "Lait & Yaourts",
    description: "Lait et produits laitiers frais du quotidien.",
    isActive: true,
    createdAt: timestampDaysAgo(235),
  },
  {
    id: "category-laiterie-fromages",
    shopId: "shop-laiterie-wouri",
    name: "Fromages",
    description: "Fromages frais et affinés.",
    isActive: true,
    createdAt: timestampDaysAgo(235),
  },
  {
    id: "category-embacam-cartons",
    shopId: "shop-embacam",
    name: "Cartons",
    description: "Cartons et solutions d'emballage carton.",
    isActive: true,
    createdAt: timestampDaysAgo(195),
  },
  {
    id: "category-embacam-plastiques",
    shopId: "shop-embacam",
    name: "Plastiques",
    description: "Sachets et bouteilles plastiques.",
    isActive: true,
    createdAt: timestampDaysAgo(195),
  },
  {
    id: "category-aromes-aromes",
    shopId: "shop-aromes-saveurs",
    name: "Arômes",
    description: "Arômes naturels pour pâtisserie et cuisine.",
    isActive: true,
    createdAt: timestampDaysAgo(145),
  },
  {
    id: "category-aromes-epices",
    shopId: "shop-aromes-saveurs",
    name: "Épices",
    description: "Mélanges d'épices traditionnelles.",
    isActive: true,
    createdAt: timestampDaysAgo(145),
  },
  {
    id: "category-mode237-femme",
    shopId: "shop-mode-237",
    name: "Femme",
    description: "Robes, pagnes et tenues femme.",
    isActive: true,
    createdAt: timestampDaysAgo(85),
  },
  {
    id: "category-mode237-homme",
    shopId: "shop-mode-237",
    name: "Homme",
    description: "Chemises et tenues homme.",
    isActive: true,
    createdAt: timestampDaysAgo(85),
  },
  {
    id: "category-techpoint-audio",
    shopId: "shop-techpoint",
    name: "Audio",
    description: "Écouteurs et accessoires audio.",
    isActive: true,
    createdAt: timestampDaysAgo(55),
  },
  {
    id: "category-techpoint-accessoires",
    shopId: "shop-techpoint",
    name: "Accessoires",
    description: "Chargeurs, batteries et accessoires divers.",
    isActive: true,
    createdAt: timestampDaysAgo(55),
  },
  {
    id: "category-beaute-hygiene",
    shopId: "shop-beaute-naturelle",
    name: "Hygiène",
    description: "Savons et produits d'hygiène naturels.",
    isActive: true,
    createdAt: timestampDaysAgo(28),
  },
  {
    id: "category-beaute-soins-corps",
    shopId: "shop-beaute-naturelle",
    name: "Soins du corps",
    // Catégorie volontairement désactivée : sert à démontrer le filtre
    // "actif/inactif" de CategoryManager (isActive ?? true la traite comme
    // masquée par défaut plutôt que comme une absence de valeur).
    description: "Huiles et crèmes — en pause le temps de renouveler le stock.",
    isActive: false,
    createdAt: timestampDaysAgo(28),
  },
];

export const mockArticles: Product[] = [
  // Laiterie du Wouri
  {
    id: "article-lait-entier",
    shopId: "shop-laiterie-wouri",
    name: "Lait entier 1L",
    description: "Lait de vache entier pasteurisé, produit localement à Douala.",
    price: 800,
    category: "Lait & Yaourts",
    images: [articleImage("article-lait-entier")],
    stock: 0,
    stockThreshold: 10,
    isPromo: false,
    createdAt: timestampDaysAgo(120),
    updatedAt: timestampDaysAgo(5),
  },
  {
    id: "article-yaourt-nature",
    shopId: "shop-laiterie-wouri",
    name: "Yaourt nature 500g",
    description: "Yaourt artisanal sans additifs, pot de 500g.",
    price: 600,
    category: "Lait & Yaourts",
    images: [articleImage("article-yaourt-nature")],
    stock: 45,
    stockThreshold: 10,
    isPromo: false,
    createdAt: timestampDaysAgo(120),
    updatedAt: timestampDaysAgo(10),
  },
  {
    id: "article-fromage-frais",
    shopId: "shop-laiterie-wouri",
    name: "Fromage frais 250g",
    description: "Fromage frais type \"wagashi\", idéal grillé ou en salade.",
    price: 1500,
    category: "Fromages",
    images: [articleImage("article-fromage-frais")],
    stock: 3,
    stockThreshold: 5,
    isPromo: false,
    createdAt: timestampDaysAgo(80),
    updatedAt: timestampDaysAgo(2),
  },

  // EmbaCam Solutions
  {
    id: "article-carton-standard",
    shopId: "shop-embacam",
    name: "Cartons d'emballage standard (lot de 10)",
    description: "Cartons double cannelure, format 40x30x30cm, lot de 10.",
    price: 3500,
    category: "Cartons",
    images: [articleImage("article-carton-standard")],
    stock: 120,
    stockThreshold: 20,
    isPromo: false,
    createdAt: timestampDaysAgo(150),
    updatedAt: timestampDaysAgo(15),
  },
  {
    id: "article-sachets-biodegradables",
    shopId: "shop-embacam",
    name: "Sachets biodégradables (paquet de 100)",
    description: "Sachets plastiques biodégradables pour commerçants, paquet de 100.",
    price: 2000,
    category: "Plastiques",
    images: [articleImage("article-sachets-biodegradables")],
    stock: 80,
    stockThreshold: 15,
    isPromo: false,
    createdAt: timestampDaysAgo(150),
    updatedAt: timestampDaysAgo(20),
  },
  {
    id: "article-bouteilles-pet",
    shopId: "shop-embacam",
    name: "Bouteilles PET 500ml (lot de 50)",
    description: "Bouteilles plastiques vides 500ml avec bouchons, lot de 50.",
    price: 7500,
    category: "Plastiques",
    images: [articleImage("article-bouteilles-pet")],
    stock: 30,
    stockThreshold: 10,
    isPromo: false,
    createdAt: timestampDaysAgo(100),
    updatedAt: timestampDaysAgo(8),
  },

  // Arômes & Saveurs
  {
    id: "article-arome-vanille",
    shopId: "shop-aromes-saveurs",
    name: "Arôme vanille naturel 100ml",
    description: "Extrait de vanille naturelle pour pâtisserie, flacon 100ml.",
    price: 1200,
    category: "Arômes",
    images: [articleImage("article-arome-vanille")],
    stock: 60,
    stockThreshold: 15,
    isPromo: false,
    createdAt: timestampDaysAgo(90),
    updatedAt: timestampDaysAgo(6),
  },
  {
    id: "article-arome-fraise",
    shopId: "shop-aromes-saveurs",
    name: "Arôme fraise 100ml",
    description: "Arôme concentré fraise, flacon 100ml.",
    price: 1100,
    category: "Arômes",
    images: [articleImage("article-arome-fraise")],
    stock: 55,
    stockThreshold: 15,
    isPromo: false,
    createdAt: timestampDaysAgo(90),
    updatedAt: timestampDaysAgo(6),
  },
  {
    id: "article-melange-epices",
    shopId: "shop-aromes-saveurs",
    name: "Mélange d'épices maison 200g",
    description: "Mélange d'épices traditionnelles camerounaises, sachet 200g.",
    price: 1800,
    category: "Épices",
    images: [articleImage("article-melange-epices")],
    stock: 40,
    stockThreshold: 10,
    isPromo: false,
    createdAt: timestampDaysAgo(70),
    updatedAt: timestampDaysAgo(4),
  },

  // Mode 237
  {
    id: "article-robe-wax",
    shopId: "shop-mode-237",
    name: "Robe wax imprimée",
    description: "Robe en tissu wax, coupe moderne, motifs imprimés.",
    price: 12000,
    category: "Femme",
    images: [articleImage("article-robe-wax")],
    stock: 18,
    stockThreshold: 5,
    isPromo: false,
    createdAt: timestampDaysAgo(50),
    updatedAt: timestampDaysAgo(3),
  },
  {
    id: "article-chemise-homme",
    shopId: "shop-mode-237",
    name: "Chemise homme coton",
    description: "Chemise homme 100% coton, coupe droite, plusieurs coloris.",
    price: 8500,
    category: "Homme",
    images: [articleImage("article-chemise-homme")],
    stock: 25,
    stockThreshold: 5,
    isPromo: true,
    promoPrice: 6800,
    promoEnd: timestampDaysAgo(-10),
    createdAt: timestampDaysAgo(50),
    updatedAt: timestampDaysAgo(1),
  },
  {
    id: "article-pagne-traditionnel",
    shopId: "shop-mode-237",
    name: "Pagne traditionnel 6 yards",
    description: "Pagne wax authentique, pièce de 6 yards.",
    price: 15000,
    category: "Femme",
    images: [articleImage("article-pagne-traditionnel")],
    stock: 12,
    stockThreshold: 5,
    isPromo: false,
    createdAt: timestampDaysAgo(45),
    updatedAt: timestampDaysAgo(2),
  },

  // TechPoint Cameroun
  {
    id: "article-ecouteurs-bluetooth",
    shopId: "shop-techpoint",
    name: "Écouteurs Bluetooth sans fil",
    description: "Écouteurs intra-auriculaires Bluetooth 5.0, autonomie 20h avec boîtier.",
    price: 9500,
    category: "Audio",
    images: [articleImage("article-ecouteurs-bluetooth")],
    stock: 35,
    stockThreshold: 10,
    isPromo: false,
    createdAt: timestampDaysAgo(6),
    updatedAt: timestampDaysAgo(1),
  },
  {
    id: "article-chargeur-usbc",
    shopId: "shop-techpoint",
    name: "Chargeur rapide USB-C 20W",
    description: "Chargeur secteur USB-C 20W, charge rapide compatible smartphones.",
    price: 5500,
    category: "Accessoires",
    images: [articleImage("article-chargeur-usbc")],
    stock: 50,
    stockThreshold: 15,
    isPromo: false,
    createdAt: timestampDaysAgo(40),
    updatedAt: timestampDaysAgo(4),
  },
  {
    id: "article-powerbank",
    shopId: "shop-techpoint",
    name: "Powerbank 10000mAh",
    description: "Batterie externe 10000mAh, double port USB, charge rapide.",
    price: 12500,
    category: "Accessoires",
    images: [articleImage("article-powerbank")],
    stock: 4,
    stockThreshold: 8,
    isPromo: true,
    promoPrice: 9990,
    promoEnd: timestampDaysAgo(-15),
    createdAt: timestampDaysAgo(40),
    updatedAt: timestampDaysAgo(1),
  },

  // Beauté Naturelle
  {
    id: "article-savon-noir",
    shopId: "shop-beaute-naturelle",
    name: "Savon noir africain 200g",
    description: "Savon noir traditionnel 100% naturel, fabriqué artisanalement.",
    price: 1500,
    category: "Hygiène",
    images: [articleImage("article-savon-noir")],
    stock: 70,
    stockThreshold: 20,
    isPromo: false,
    createdAt: timestampDaysAgo(25),
    updatedAt: timestampDaysAgo(3),
  },
  {
    id: "article-huile-karite",
    shopId: "shop-beaute-naturelle",
    name: "Huile de karité pure 250ml",
    description: "Huile de karité pure et non raffinée, flacon 250ml.",
    price: 2500,
    category: "Soins du corps",
    images: [articleImage("article-huile-karite")],
    stock: 3,
    stockThreshold: 10,
    isPromo: false,
    createdAt: timestampDaysAgo(3),
    updatedAt: timestampDaysAgo(1),
  },
  {
    id: "article-creme-hydratante",
    shopId: "shop-beaute-naturelle",
    name: "Crème hydratante corps 300ml",
    description: "Crème hydratante au beurre de karité et huiles naturelles, 300ml.",
    price: 3200,
    category: "Soins du corps",
    images: [articleImage("article-creme-hydratante")],
    stock: 28,
    stockThreshold: 10,
    isPromo: false,
    createdAt: timestampDaysAgo(20),
    updatedAt: timestampDaysAgo(2),
  },
];

/**
 * Utilisateurs de démo — sert à la fois la page Super Admin (recherche par
 * nom/email/téléphone parmi TOUS les comptes de la plateforme, quel que soit
 * leur rôle) et l'équipe de chaque boutique côté admin (`TeamList`, qui
 * reçoit simplement les comptes dont `shopId` correspond — un client n'a
 * jamais de `shopId`, cohérent avec le commentaire du modèle `User` réel).
 *
 * `id` des 6 admins == `Shop.ownerId` correspondant ci-dessus, pour que les
 * boutiques et leurs propriétaires restent cohérents entre eux. Les deux
 * façons d'obtenir le rôle admin (Module 12, BF-68) sont représentées :
 * `adminSource: "manual"` (attribué à la main par le Super Admin, jamais
 * d'expiration) et `"subscription"` (abonnement payant, avec
 * `subscriptionPlan`/`subscriptionExpiresAt` dans le futur — pas encore
 * expiré, sinon `SuperAdminPanel` n'a aucune UI qui distinguerait ce cas).
 */
export const mockUsers: User[] = [
  // Propriétaires des boutiques (role: "admin")
  {
    id: "owner-laiterie-wouri",
    displayName: "Jean-Pierre Mbarga",
    email: "jp.mbarga@example.com",
    phone: "+237677000001",
    role: "admin",
    shopId: "shop-laiterie-wouri",
    adminSource: "manual",
    createdAt: timestampDaysAgo(240),
  },
  {
    id: "owner-embacam",
    displayName: "Marie Ngo Bell",
    email: "marie.ngobell@example.com",
    phone: "+237677000002",
    role: "admin",
    shopId: "shop-embacam",
    adminSource: "subscription",
    subscriptionPlan: "monthly",
    subscriptionExpiresAt: timestampDaysAgo(-18),
    createdAt: timestampDaysAgo(200),
  },
  {
    id: "owner-aromes-saveurs",
    displayName: "Paul Fotso",
    email: "paul.fotso@example.com",
    phone: "+237677000003",
    role: "admin",
    shopId: "shop-aromes-saveurs",
    adminSource: "manual",
    createdAt: timestampDaysAgo(150),
  },
  {
    id: "owner-mode-237",
    displayName: "Aïcha Njoya",
    email: "aicha.njoya@example.com",
    phone: "+237677000004",
    role: "admin",
    shopId: "shop-mode-237",
    adminSource: "subscription",
    subscriptionPlan: "quarterly",
    subscriptionExpiresAt: timestampDaysAgo(-60),
    createdAt: timestampDaysAgo(90),
  },
  {
    id: "owner-techpoint",
    displayName: "Serge Talla",
    email: "serge.talla@example.com",
    phone: "+237677000005",
    role: "admin",
    shopId: "shop-techpoint",
    adminSource: "manual",
    createdAt: timestampDaysAgo(60),
  },
  {
    id: "owner-beaute-naturelle",
    displayName: "Solange Etame",
    email: "solange.etame@example.com",
    phone: "+237677000006",
    role: "admin",
    shopId: "shop-beaute-naturelle",
    adminSource: "subscription",
    subscriptionPlan: "yearly",
    subscriptionExpiresAt: timestampDaysAgo(-300),
    createdAt: timestampDaysAgo(30),
  },

  // Vendeurs invités (role: "seller") — au moins un par boutique
  {
    id: "user-christelle-manga",
    displayName: "Christelle Manga",
    email: "christelle.manga@example.com",
    phone: "+237678100001",
    role: "seller",
    shopId: "shop-laiterie-wouri",
    createdAt: timestampDaysAgo(100),
  },
  {
    id: "user-herve-kamdem",
    displayName: "Hervé Kamdem",
    email: "herve.kamdem@example.com",
    phone: "+237678100002",
    role: "seller",
    shopId: "shop-embacam",
    createdAt: timestampDaysAgo(80),
  },
  {
    id: "user-josiane-tchoua",
    displayName: "Josiane Tchoua",
    email: "josiane.tchoua@example.com",
    phone: "+237678100003",
    role: "seller",
    shopId: "shop-aromes-saveurs",
    createdAt: timestampDaysAgo(60),
  },
  {
    id: "user-brice-fongang",
    displayName: "Brice Fongang",
    email: "brice.fongang@example.com",
    phone: "+237678100004",
    role: "seller",
    shopId: "shop-mode-237",
    createdAt: timestampDaysAgo(40),
  },
  {
    id: "user-nadege-mballa",
    displayName: "Nadège Mballa",
    email: "nadege.mballa@example.com",
    phone: "+237678100005",
    role: "seller",
    shopId: "shop-mode-237",
    createdAt: timestampDaysAgo(20),
  },
  {
    id: "user-dorothee-abena",
    displayName: "Dorothée Abena",
    email: "dorothee.abena@example.com",
    phone: "+237678100006",
    role: "seller",
    shopId: "shop-techpoint",
    createdAt: timestampDaysAgo(30),
  },
  {
    id: "user-yannick-ndzana",
    displayName: "Yannick Ndzana",
    email: "yannick.ndzana@example.com",
    phone: "+237678100007",
    role: "seller",
    shopId: "shop-beaute-naturelle",
    createdAt: timestampDaysAgo(15),
  },

  // Clients (role: "client") — jamais de shopId, certains inscrits par
  // téléphone/anonyme donc sans email (comme le documente le modèle User).
  {
    id: "user-armand-ekwalla",
    displayName: "Armand Ekwalla",
    email: "armand.ekwalla@example.com",
    role: "client",
    createdAt: timestampDaysAgo(10),
  },
  {
    id: "user-vanessa-njike",
    displayName: "Vanessa Njike",
    phone: "+237679200002",
    role: "client",
    createdAt: timestampDaysAgo(8),
  },
  {
    id: "user-patrick-ateba",
    displayName: "Patrick Ateba",
    email: "patrick.ateba@example.com",
    role: "client",
    createdAt: timestampDaysAgo(5),
  },
  {
    id: "user-lea-mengue",
    displayName: "Léa Mengue",
    phone: "+237679200004",
    role: "client",
    createdAt: timestampDaysAgo(2),
  },
];

export function getArticlesByShop(shopId: string): Product[] {
  return mockArticles.filter((article) => article.shopId === shopId);
}

export function getCategoriesByShop(shopId: string): Category[] {
  return mockCategories.filter((category) => category.shopId === shopId);
}

/** Miroir démo de `AuthService.listTeamMembers(shopId)` : tous les comptes
 * rattachés à cette boutique (le propriétaire admin ET les vendeurs
 * invités), jamais les clients qui n'ont pas de `shopId`. */
export function getTeamMembersByShop(shopId: string): User[] {
  return mockUsers.filter((user) => user.shopId === shopId);
}
