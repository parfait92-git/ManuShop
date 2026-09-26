const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const refreshProfileMock = jest.fn();
let mockProfile: { id: string; shopId?: string } | null = {
  id: "uid-1",
  shopId: "shop-1",
};
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({ profile: mockProfile, refreshProfile: refreshProfileMock }),
}));

jest.mock("../../services/ShopService", () => ({
  shopService: { listMyShops: jest.fn() },
}));

const switchShopMock = jest.fn();
jest.mock("../../services/AuthService", () => ({
  authService: { switchShop: (...args: unknown[]) => switchShopMock(...args) },
}));

jest.mock("../storefront/CreateShopWizard", () => ({
  CreateShopWizard: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-shop-wizard" /> : null,
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";

import { ShopManagementPageContent } from "@/components/dashboard/ShopManagementPageContent";
import type { Shop } from "@/models/shop/Shop";
import { shopService } from "@/services/ShopService";

const mockedShopService = jest.mocked(shopService);

function fakeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: "shop-1",
    name: "Chez Mado",
    logo: "",
    address: "Douala",
    phone: "",
    whatsapp: "",
    currency: "XAF",
    ownerId: "uid-1",
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

describe("ShopManagementPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = { id: "uid-1", shopId: "shop-1" };
  });

  it("lists every shop owned by the current user with a status badge", async () => {
    mockedShopService.listMyShops.mockResolvedValue([
      fakeShop({ id: "shop-1", name: "Chez Mado", isPublished: true }),
      fakeShop({ id: "shop-2", name: "Chez Awa", isPublished: false }),
    ]);
    render(<ShopManagementPageContent />);

    expect(await screen.findByText("Chez Mado")).toBeInTheDocument();
    expect(screen.getByText("Chez Awa")).toBeInTheDocument();
    expect(screen.getByText("Publiée")).toBeInTheDocument();
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
    expect(mockedShopService.listMyShops).toHaveBeenCalledWith("uid-1");
  });

  it("flags a subscription-based shop past its expiry date as expired", async () => {
    mockedShopService.listMyShops.mockResolvedValue([
      fakeShop({
        isPublished: false,
        adminSource: "subscription",
        subscriptionExpiresAt: Timestamp.fromDate(
          new Date("2020-01-01T00:00:00Z")
        ),
      }),
    ]);
    render(<ShopManagementPageContent />);

    expect(await screen.findByText("Abonnement expiré")).toBeInTheDocument();
  });

  it("navigates straight to /dashboard when managing the already-current shop", async () => {
    mockedShopService.listMyShops.mockResolvedValue([fakeShop({ id: "shop-1" })]);
    const user = userEvent.setup();
    render(<ShopManagementPageContent />);

    await user.click(await screen.findByRole("button", { name: "Gérer" }));

    expect(switchShopMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("switches the active shop before navigating when managing a different one", async () => {
    mockProfile = { id: "uid-1", shopId: "shop-1" };
    mockedShopService.listMyShops.mockResolvedValue([
      fakeShop({ id: "shop-2", name: "Chez Awa" }),
    ]);
    const user = userEvent.setup();
    render(<ShopManagementPageContent />);

    await user.click(await screen.findByRole("button", { name: "Gérer" }));

    await waitFor(() => expect(switchShopMock).toHaveBeenCalledWith("shop-2"));
    expect(refreshProfileMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("opens the shop-creation wizard from the dashed card", async () => {
    mockedShopService.listMyShops.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<ShopManagementPageContent />);

    await screen.findByText("Créer une nouvelle boutique");
    expect(screen.queryByTestId("create-shop-wizard")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Créer une nouvelle boutique/ })
    );

    expect(screen.getByTestId("create-shop-wizard")).toBeInTheDocument();
  });
});
