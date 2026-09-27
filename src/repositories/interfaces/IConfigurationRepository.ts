import type { PlatformConfiguration } from "@/models/configuration/PlatformConfiguration";

/** Lecture seule — l'écriture passe par une Server Action Super Admin
 * (`configurationActions.ts`), jamais par ce repository, voir
 * PlatformConfiguration. */
export interface IConfigurationRepository {
  getGeneral(): Promise<PlatformConfiguration | null>;
}
