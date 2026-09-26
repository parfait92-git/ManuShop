import type { PlatformConfiguration } from "@/models/configuration/PlatformConfiguration";

/** Lecture seule — jamais d'écriture depuis l'app, voir PlatformConfiguration. */
export interface IConfigurationRepository {
  getGeneral(): Promise<PlatformConfiguration | null>;
}
