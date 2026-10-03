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

/**
 * Adresse saisie par le Super Admin (nouveau domaine, 2026-10-03) → forme
 * enregistrée : origine seule (« https://www.exemple.cm »), sans chemin ni
 * « / » final. HTTPS obligatoire, sauf pour un serveur local (essais).
 * `null` si l'adresse n'est pas utilisable.
 */
export function normalizeSiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  if (!local && !url.hostname.includes(".")) return null;
  return url.origin;
}
