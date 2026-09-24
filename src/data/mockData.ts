import { Timestamp } from "firebase/firestore";

import type { Product } from "@/models/product/Product";
import type { Shop } from "@/models/shop/Shop";

/**
 * Données de démo pour le catalogue multi-boutiques — jamais lues depuis
 * Firestore, uniquement pour prototyper/présenter l'UI sans backend réel.
 *
 * Réutilise directement les types du domaine (`Shop`, `Product`) plutôt que
 * de définir un `Article` séparé : `Product` couvre déjà exactement les
 * mêmes champs (nom, description, prix, catégorie, stock, images...), donc
 * un second type ferait doublon. `MockShop` étend `Shop` avec `sector`, le
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

export const mockArticles: Product[] = [
  // Laiterie du Wouri
  {
    id: "article-lait-entier",
    shopId: "shop-laiterie-wouri",
    name: "Lait entier 1L",
    description: "Lait de vache entier pasteurisé, produit localement à Douala.",
    price: 800,
    category: "Produits laitiers",
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
    category: "Produits laitiers",
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
    category: "Produits laitiers",
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
    category: "Emballages",
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
    category: "Emballages",
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
    category: "Emballages",
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
    category: "Arômes et épices",
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
    category: "Arômes et épices",
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
    category: "Arômes et épices",
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
    category: "Vêtements",
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
    category: "Vêtements",
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
    category: "Vêtements",
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
    category: "Électronique",
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
    category: "Électronique",
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
    category: "Électronique",
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
    category: "Cosmétiques",
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
    category: "Cosmétiques",
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
    category: "Cosmétiques",
    images: [articleImage("article-creme-hydratante")],
    stock: 28,
    stockThreshold: 10,
    isPromo: false,
    createdAt: timestampDaysAgo(20),
    updatedAt: timestampDaysAgo(2),
  },
];

export function getArticlesByShop(shopId: string): Product[] {
  return mockArticles.filter((article) => article.shopId === shopId);
}
