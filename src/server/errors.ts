import "server-only";

/** Aucun token valide fourni à une Server Action privilégiée. */
export class UnauthenticatedError extends Error {
  constructor(message = "Authentification requise.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

/** Appelant authentifié mais sans le privilège requis (ex. pas Super Admin). */
export class ForbiddenError extends Error {
  constructor(message = "Privilège insuffisant.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Document ciblé par une Server Action introuvable (ex. commande supprimée
 * entre-temps). */
export class NotFoundError extends Error {
  constructor(message = "Ressource introuvable.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Transition ou entrée refusée par une règle métier revérifiée en code
 * (ex. motif d'annulation manquant, statut de commande incompatible avec la
 * transition demandée) — distinct de `ForbiddenError` (privilège) : l'appel
 * est autorisé, mais la donnée/l'état ne le permet pas. */
export class ValidationError extends Error {
  constructor(message = "Requête invalide.") {
    super(message);
    this.name = "ValidationError";
  }
}
