import "server-only";

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
  verify,
  type KeyObject,
} from "crypto";

/**
 * Signature numérique des factures et de l'historique des commandes
 * (2026-10-03). Ed25519, clé privée détenue par le serveur seul :
 * `INVOICE_SIGNING_KEY`, la clé PKCS#8 encodée en base64 (DER), à générer
 * une fois avec :
 *
 *   node -e "const {generateKeyPairSync}=require('crypto');console.log(generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'der'}).toString('base64'))"
 *
 * puis à conserver précieusement : sans elle, les signatures déjà émises ne
 * peuvent plus être vérifiées (une nouvelle clé n'invalide rien, mais les
 * anciennes signatures apparaîtront « signées avec une autre clé »).
 *
 * Sans clé configurée, rien ne bloque (commandes et factures continuent),
 * mais rien n'est signé et la page de vérification le dit.
 */

interface SigningKeys {
  privateKey: KeyObject;
  publicKey: KeyObject;
  /** Empreinte courte de la clé publique, enregistrée avec chaque
   * signature : dit avec quelle clé elle a été faite. */
  keyId: string;
}

let cached: SigningKeys | null | undefined;

export function getSigningKeys(): SigningKeys | null {
  if (cached !== undefined) return cached;
  const encoded = process.env.INVOICE_SIGNING_KEY?.trim();
  if (!encoded) {
    console.error("INVOICE_SIGNING_KEY absente : factures et historiques ne sont pas signés.");
    cached = null;
    return cached;
  }
  try {
    const privateKey = createPrivateKey({
      key: Buffer.from(encoded, "base64"),
      format: "der",
      type: "pkcs8",
    });
    if (privateKey.asymmetricKeyType !== "ed25519") {
      throw new Error(`clé ${privateKey.asymmetricKeyType}, Ed25519 attendue`);
    }
    const publicKey = createPublicKey(privateKey);
    const keyId = createHash("sha256")
      .update(publicKey.export({ type: "spki", format: "der" }))
      .digest("hex")
      .slice(0, 16);
    cached = { privateKey, publicKey, keyId };
  } catch (error) {
    console.error("INVOICE_SIGNING_KEY illisible : rien n'est signé.", error);
    cached = null;
  }
  return cached;
}

/** Pour les tests : relit la clé à la prochaine utilisation. */
export function resetSigningKeysForTests(): void {
  cached = undefined;
}

/**
 * JSON canonique : clés triées à tous les niveaux, pas d'espaces. Une même
 * donnée donne toujours le même texte, donc la même empreinte et la même
 * signature, quel que soit l'ordre dans lequel Firestore rend les champs.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export interface Signature {
  /** Signature Ed25519, base64url. */
  signature: string;
  keyId: string;
}

/** Signe un texte, ou `null` sans clé configurée. */
export function signText(text: string): Signature | null {
  const keys = getSigningKeys();
  if (!keys) return null;
  return {
    signature: sign(null, Buffer.from(text, "utf8"), keys.privateKey).toString("base64url"),
    keyId: keys.keyId,
  };
}

export type SignatureCheck = "valid" | "invalid" | "other_key" | "unsigned" | "no_key";

/** Vérifie une signature avec la clé du serveur. */
export function checkSignature(text: string, signed: Partial<Signature> | undefined): SignatureCheck {
  if (!signed?.signature || !signed.keyId) return "unsigned";
  const keys = getSigningKeys();
  if (!keys) return "no_key";
  if (signed.keyId !== keys.keyId) return "other_key";
  try {
    return verify(
      null,
      Buffer.from(text, "utf8"),
      keys.publicKey,
      Buffer.from(signed.signature, "base64url")
    )
      ? "valid"
      : "invalid";
  } catch {
    return "invalid";
  }
}

/** Alphabet de Crockford : sans I, L, O ni U, pour ne pas confondre
 * 1/I/L et 0/O en recopiant le code à la main. */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 10;

/** Code de vérification aléatoire (50 bits), impossible à deviner :
 * « 7K4PQ9X2MB ». */
export function generateVerificationCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % 32]).join("");
}

/** Code saisi à la main → forme enregistrée : majuscules, sans tirets ni
 * espaces ni préfixe « MS », O lu 0, I et L lus 1. `null` si ce ne peut
 * pas être un code. */
export function normalizeVerificationCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/^\s*MS[-\s]*/, "")
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(cleaned) ? cleaned : null;
}

/** Forme imprimée : « MS-7K4PQ-9X2MB ». */
export function formatVerificationCode(code: string): string {
  return `MS-${code.slice(0, 5)}-${code.slice(5)}`;
}
