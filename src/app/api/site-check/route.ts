/**
 * Réponse témoin de ManuShop (2026-10-03) : avant d'enregistrer un nouveau
 * domaine, le Super Admin vérifie qu'il mène bien à cette application
 * (`setSiteUrlAction`) — sans quoi les QR codes des factures et les liens
 * de partage pointeraient vers un site mort ou étranger.
 */
export function GET() {
  return Response.json({ app: "manushop" }, { headers: { "Cache-Control": "no-store" } });
}
