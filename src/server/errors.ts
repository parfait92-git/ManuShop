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
