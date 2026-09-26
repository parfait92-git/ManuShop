import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { PlatformConfiguration } from "@/models/configuration/PlatformConfiguration";
import type { IConfigurationRepository } from "@/repositories/interfaces/IConfigurationRepository";

const CONFIGURATION_COLLECTION = "configuration";
const GENERAL_DOC_ID = "general";

export class ConfigurationRepository implements IConfigurationRepository {
  async getGeneral(): Promise<PlatformConfiguration | null> {
    const snapshot = await getDoc(
      doc(db, CONFIGURATION_COLLECTION, GENERAL_DOC_ID)
    );
    if (!snapshot.exists()) return null;
    return snapshot.data() as PlatformConfiguration;
  }
}

export const configurationRepository = new ConfigurationRepository();
