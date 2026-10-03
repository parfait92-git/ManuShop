import { auth } from "@/lib/firebase";
import { configurationRepository } from "@/repositories/ConfigurationRepository";
import type { IConfigurationRepository } from "@/repositories/interfaces/IConfigurationRepository";
import {
  setDemoCatalogueEnabledAction,
  setUsdToXafRateAction,
} from "@/server/actions/configurationActions";

export class ConfigurationService {
  constructor(
    private readonly configuration: IConfigurationRepository = configurationRepository
  ) {}

  /** `true` uniquement si un Super Admin a explicitement désactivé
   * `/demo-catalogue` — absent/`true` ne dit rien en soi, c'est la
   * détection automatique qui décide alors (voir
   * `useDemoCatalogueAvailable`). */
  async isDemoCatalogueForceDisabled(): Promise<boolean> {
    const config = await this.configuration.getGeneral();
    return config?.demoCatalogueEnabled === false;
  }

  /** Pour l'interrupteur Super Admin — simple négation de
   * `isDemoCatalogueForceDisabled`, mais nommé du point de vue de l'UI. */
  async isDemoCatalogueEnabled(): Promise<boolean> {
    return !(await this.isDemoCatalogueForceDisabled());
  }

  /** Revalidé côté serveur (voir `configurationActions.ts`) — ne dépend
   * plus d'un accès direct à la console Firebase. */
  async setDemoCatalogueEnabled(enabled: boolean): Promise<void> {
    await setDemoCatalogueEnabledAction(await this.getCallerIdToken(), enabled);
  }

  /** Valeur d'un dollar en FCFA, ou `undefined` si pas encore fixée. */
  async getUsdToXafRate(): Promise<number | undefined> {
    const config = await this.configuration.getGeneral();
    return config?.usdToXafRate;
  }

  async setUsdToXafRate(rate: number): Promise<void> {
    await setUsdToXafRateAction(await this.getCallerIdToken(), rate);
  }

  private async getCallerIdToken(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Vous devez être connecté.");
    }
    return token;
  }
}

export const configurationService = new ConfigurationService();
