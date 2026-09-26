const SESSION_ID_STORAGE_KEY = "manushop-session-id";

/**
 * Session unique par compte (un seul navigateur/appareil à la fois, demande
 * utilisateur du 2026-09-26) — voir `AuthProvider`. Stocké en
 * `localStorage` (pas `sessionStorage`) : partagé entre onglets du MÊME
 * navigateur exprès, pour qu'ouvrir un 2e onglet ne se fasse pas
 * faussement déconnecter l'un l'autre — seul un navigateur/appareil
 * différent doit invalider la session.
 */

export function getLocalSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Génère et stocke un nouvel id — toujours frais, jamais réutilisé. */
export function createLocalSessionId(): string {
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(SESSION_ID_STORAGE_KEY, id);
  } catch {
    // Stockage indisponible (navigation privée stricte, quota...) — la
    // session unique échoue silencieusement pour ce client plutôt que de
    // bloquer la connexion : dégradation acceptable, pas une raison de
    // faire échouer l'authentification elle-même.
  }
  return id;
}

export function clearLocalSessionId(): void {
  try {
    localStorage.removeItem(SESSION_ID_STORAGE_KEY);
  } catch {
    // ignore — voir createLocalSessionId
  }
}
