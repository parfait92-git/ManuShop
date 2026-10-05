import { clientGuide } from "./client";
import { managerGuide } from "./manager";
import { sellerGuide } from "./seller";
import { superAdminGuide } from "./superAdmin";
import type { Guide } from "./types";

/** Version imprimée en pied de page : à mettre à jour avec le contenu. */
export const GUIDE_VERSION = "Version d'octobre 2026";

/** Guides d'utilisation, un par rôle (2026-10-04), dans l'ordre des onglets. */
export const GUIDES: Guide[] = [managerGuide, sellerGuide, clientGuide, superAdminGuide];
