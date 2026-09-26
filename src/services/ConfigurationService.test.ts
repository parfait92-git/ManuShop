// See ProductService.test.ts: avoids loading the real Firebase SDK via the
// repository's transitive "@/lib/firebase" import.
jest.mock("../lib/firebase", () => ({
  db: {},
}));

import { ConfigurationService } from "@/services/ConfigurationService";
import type { IConfigurationRepository } from "@/repositories/interfaces/IConfigurationRepository";

describe("ConfigurationService", () => {
  let configuration: jest.Mocked<IConfigurationRepository>;
  let service: ConfigurationService;

  beforeEach(() => {
    configuration = { getGeneral: jest.fn() };
    service = new ConfigurationService(configuration);
  });

  describe("isDemoCatalogueForceDisabled", () => {
    it("returns true only when explicitly set to false", async () => {
      configuration.getGeneral.mockResolvedValue({ demoCatalogueEnabled: false });
      expect(await service.isDemoCatalogueForceDisabled()).toBe(true);
    });

    it("returns false when explicitly enabled", async () => {
      configuration.getGeneral.mockResolvedValue({ demoCatalogueEnabled: true });
      expect(await service.isDemoCatalogueForceDisabled()).toBe(false);
    });

    it("returns false when there is no configuration document", async () => {
      configuration.getGeneral.mockResolvedValue(null);
      expect(await service.isDemoCatalogueForceDisabled()).toBe(false);
    });
  });
});
