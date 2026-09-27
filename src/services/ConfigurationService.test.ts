// See ProductService.test.ts: avoids loading the real Firebase SDK via the
// repository's transitive "@/lib/firebase" import.
jest.mock("../lib/firebase", () => ({
  db: {},
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue("token-1") } },
}));

const setDemoCatalogueEnabledAction = jest.fn();
jest.mock("../server/actions/configurationActions", () => ({
  setDemoCatalogueEnabledAction: (...args: unknown[]) =>
    setDemoCatalogueEnabledAction(...args),
}));

import { ConfigurationService } from "@/services/ConfigurationService";
import type { IConfigurationRepository } from "@/repositories/interfaces/IConfigurationRepository";

describe("ConfigurationService", () => {
  let configuration: jest.Mocked<IConfigurationRepository>;
  let service: ConfigurationService;

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe("isDemoCatalogueEnabled", () => {
    it("is the negation of isDemoCatalogueForceDisabled", async () => {
      configuration.getGeneral.mockResolvedValue({ demoCatalogueEnabled: false });
      expect(await service.isDemoCatalogueEnabled()).toBe(false);

      configuration.getGeneral.mockResolvedValue(null);
      expect(await service.isDemoCatalogueEnabled()).toBe(true);
    });
  });

  describe("setDemoCatalogueEnabled", () => {
    it("delegates to the server action with the caller's ID token", async () => {
      await service.setDemoCatalogueEnabled(false);
      expect(setDemoCatalogueEnabledAction).toHaveBeenCalledWith("token-1", false);
    });
  });
});
