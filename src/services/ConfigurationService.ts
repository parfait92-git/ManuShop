import { configurationRepository } from "@/repositories/ConfigurationRepository";
import type { IConfigurationRepository } from "@/repositories/interfaces/IConfigurationRepository";

export class ConfigurationService {
  constructor(
    private readonly configuration: IConfigurationRepository = configurationRepository
  ) {}

  /** `true` uniquement si un Super Admin a explicitement désactivé
   * `/demo-catalogue` depuis la console Firebase — absent/`true` ne dit
   * rien en soi, c'est la détection automatique qui décide alors (voir
   * `useDemoCatalogueAvailable`). */
  async isDemoCatalogueForceDisabled(): Promise<boolean> {
    const config = await this.configuration.getGeneral();
    return config?.demoCatalogueEnabled === false;
  }
}

export const configurationService = new ConfigurationService();
