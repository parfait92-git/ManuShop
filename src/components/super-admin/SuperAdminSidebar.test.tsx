jest.mock("next/navigation", () => ({
  usePathname: () => "/super-admin",
}));

const useNewSupportMessagesCountMock = jest.fn();
jest.mock("../../hooks/useNewSupportMessagesCount", () => ({
  useNewSupportMessagesCount: () => useNewSupportMessagesCountMock(),
}));

import { fireEvent, render, screen } from "@testing-library/react";

import { SuperAdminSidebar } from "./SuperAdminSidebar";

describe("SuperAdminSidebar", () => {
  beforeEach(() => {
    useNewSupportMessagesCountMock.mockReturnValue(0);
  });

  it("shows the Super Admin identity and the Comptes link, marked active", () => {
    render(<SuperAdminSidebar />);

    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Comptes" });
    expect(link).toHaveAttribute("href", "/super-admin");
    expect(link).toHaveClass("bg-slate-900");
  });

  it("shows the Réglages link", () => {
    render(<SuperAdminSidebar />);
    expect(screen.getByRole("link", { name: "Réglages" })).toHaveAttribute(
      "href",
      "/super-admin/reglages"
    );
  });

  it("shows the Messages link", () => {
    render(<SuperAdminSidebar />);
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute(
      "href",
      "/super-admin/messages"
    );
  });

  it("calls onNavigate when a link area is clicked (mobile nav close)", () => {
    const onNavigate = jest.fn();
    render(<SuperAdminSidebar onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("link", { name: "Comptes" }));

    expect(onNavigate).toHaveBeenCalled();
  });

  it("shows no badge on Messages when there are no pending messages", () => {
    render(<SuperAdminSidebar />);
    expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
  });

  it("shows a badge with the pending message count on Messages", () => {
    useNewSupportMessagesCountMock.mockReturnValue(3);
    render(<SuperAdminSidebar />);

    expect(
      screen.getByRole("link", { name: "Messages 3 messages en attente" })
    ).toBeInTheDocument();
  });

  it("caps the badge at 9+", () => {
    useNewSupportMessagesCountMock.mockReturnValue(15);
    render(<SuperAdminSidebar />);

    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});
