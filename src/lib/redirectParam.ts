export const REDIRECT_PARAM = "redirect";

/**
 * `?redirect=` n'est jamais suivi tel quel : un chemin absolu externe
 * (`https://evil.example`) ou protocole-relatif (`//evil.example`) y
 * enverrait l'utilisateur après connexion — redirection ouverte classique.
 * Seul un chemin interne commençant par un unique `/` est accepté.
 */
export function isSafeRedirectTarget(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/** Lit et valide `?redirect=` depuis une query string (`window.location.search`
 * ou équivalent) — `null` si absent ou dangereux. */
export function getRedirectParam(search: string): string | null {
  const value = new URLSearchParams(search).get(REDIRECT_PARAM);
  if (!value) return null;
  return isSafeRedirectTarget(value) ? value : null;
}

/** Construit `/login?redirect=...` (et paramètres additionnels) à partir
 * d'une cible déjà validée — utilisé pour propager `redirect` d'une page
 * d'auth à l'autre (login ↔ register). */
export function buildAuthHref(
  path: "/login" | "/register",
  redirect: string | null,
  extra?: Record<string, string>
): string {
  const params = new URLSearchParams();
  if (redirect) params.set(REDIRECT_PARAM, redirect);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
