import { getAdminDb } from "@/lib/firebaseAdmin";
import { promoEndsAt } from "@/lib/promo";
import { pushPromoEnding } from "@/server/push/events";

const HOUR = 3_600_000;

/**
 * Rappel de fin de promotion (BF-60, 2026-10-04) : tâche planifiée Vercel,
 * chaque matin (voir `vercel.json`). Prévient l'équipe de chaque boutique
 * dont une promotion se termine demain soir — une seule fois par
 * promotion : celles qui finissent dans 24 à 48 heures.
 *
 * Réservée à Vercel : l'appel porte `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  const db = getAdminDb();
  const now = Date.now();
  const snapshot = await db.collection("products").where("isPromo", "==", true).get();

  const byShop = new Map<string, string[]>();
  for (const doc of snapshot.docs) {
    const product = doc.data();
    if (!product.promoEnd || product.deletedAt || product.isPublished === false) continue;
    const endsIn = promoEndsAt(product.promoEnd).getTime() - now;
    if (endsIn <= 24 * HOUR || endsIn > 48 * HOUR) continue;
    const list = byShop.get(product.shopId) ?? [];
    list.push(String(product.name));
    byShop.set(product.shopId, list);
  }

  await Promise.all([...byShop].map(([shopId, products]) => pushPromoEnding(db, { shopId, products })));
  return Response.json({ shops: byShop.size, products: [...byShop.values()].flat().length });
}
