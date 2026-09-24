jest.mock("../../services/AuthService", () => ({
  authService: { listTeamMembers: jest.fn() },
}));

jest.mock("./InviteSellerForm", () => ({
  InviteSellerForm: () => <div data-testid="invite-form" />,
}));

import { render, screen } from "@testing-library/react";

import { TeamPageContent } from "@/components/dashboard/TeamPageContent";
import { authService } from "@/services/AuthService";

const authServiceMock = authService as jest.Mocked<typeof authService>;

describe("TeamPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a read-only demo preview when the shop has no real team members yet", async () => {
    authServiceMock.listTeamMembers.mockResolvedValue([]);
    render(<TeamPageContent shopId="shop-1" />);

    expect(await screen.findByText("Aucun membre pour le moment.")).toBeInTheDocument();
    expect(
      screen.getByText("Exemple — à quoi ressemblera votre équipe")
    ).toBeInTheDocument();
    // The demo members themselves (from mockData) are rendered read-only.
    expect(screen.getByText("Aïcha Njoya")).toBeInTheDocument();
  });

  it("does not show the demo preview once the shop has real team members", async () => {
    authServiceMock.listTeamMembers.mockResolvedValue([
      {
        id: "u1",
        displayName: "Vraie Vendeuse",
        email: "vraie@example.com",
        role: "seller",
      } as never,
    ]);
    render(<TeamPageContent shopId="shop-1" />);

    expect(await screen.findByText("Vraie Vendeuse")).toBeInTheDocument();
    expect(
      screen.queryByText("Exemple — à quoi ressemblera votre équipe")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Aïcha Njoya")).not.toBeInTheDocument();
  });
});
