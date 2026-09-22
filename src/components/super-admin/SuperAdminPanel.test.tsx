import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../lib/firebase", () => ({ db: {} }));

import { platformAdminService } from "@/services/PlatformAdminService";
import { SuperAdminPanel } from "@/components/super-admin/SuperAdminPanel";
import type { User } from "@/models/user/User";

jest.mock("../../services/PlatformAdminService", () => ({
  platformAdminService: {
    searchUsers: jest.fn(),
    grantAdmin: jest.fn(),
    revokeAdmin: jest.fn(),
  },
}));

const mockedService = jest.mocked(platformAdminService);

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    displayName: "Ada Diallo",
    email: "ada@example.com",
    role: "client",
    createdAt: {} as never,
    ...overrides,
  };
}

describe("SuperAdminPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it("searches and shows an empty state when nothing matches", async () => {
    mockedService.searchUsers.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<SuperAdminPanel />);

    await user.type(
      screen.getByLabelText("Rechercher un utilisateur"),
      "inconnu"
    );
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(
      await screen.findByText(/Aucun utilisateur ne correspond/)
    ).toBeInTheDocument();
    expect(mockedService.searchUsers).toHaveBeenCalledWith("inconnu");
  });

  it("grants admin to a matching client", async () => {
    mockedService.searchUsers.mockResolvedValue([fakeUser()]);
    mockedService.grantAdmin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SuperAdminPanel />);

    await user.type(screen.getByLabelText("Rechercher un utilisateur"), "ada");
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    await user.click(
      await screen.findByRole("button", { name: /Donner l'admin/ })
    );

    await waitFor(() =>
      expect(mockedService.grantAdmin).toHaveBeenCalledWith("u1")
    );
    expect(
      await screen.findByRole("button", { name: /Retirer l'admin/ })
    ).toBeInTheDocument();
  });

  it("revokes admin after confirmation", async () => {
    mockedService.searchUsers.mockResolvedValue([
      fakeUser({ role: "admin", adminSource: "manual" }),
    ]);
    mockedService.revokeAdmin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SuperAdminPanel />);

    await user.type(screen.getByLabelText("Rechercher un utilisateur"), "ada");
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    await user.click(
      await screen.findByRole("button", { name: /Retirer l'admin/ })
    );

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockedService.revokeAdmin).toHaveBeenCalledWith("u1")
    );
    expect(
      await screen.findByRole("button", { name: /Donner l'admin/ })
    ).toBeInTheDocument();
  });
});
