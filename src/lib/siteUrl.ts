/**
 * Adresse publique du site, sans "/" final — base des liens absolus
 * (aperçus de partage, plan du site, données structurées). Ordre : adresse
 * configurée (`NEXT_PUBLIC_APP_URL`), sinon le domaine de production
 * fourni par Vercel, sinon le serveur local. `||` plutôt que `??` : une
 * variable déclarée vide dans `.env` vaut "", pas `undefined`.
 */
export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    "http://localhost:3000";
  return configured.replace(/\/+$/, "");
}
