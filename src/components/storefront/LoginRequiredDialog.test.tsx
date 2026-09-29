const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { fireEvent, render, screen } from "@testing-library/react";

import { LoginRequiredDialog } from "./LoginRequiredDialog";

describe("LoginRequiredDialog", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders nothing visible when closed", () => {
    render(
      <LoginRequiredDialog
        open={false}
        onOpenChange={jest.fn()}
        redirectTo="/checkout/payment"
      />
    );

    expect(
      screen.queryByText("Connectez-vous pour continuer")
    ).not.toBeInTheDocument();
  });

  it("closes via the cancel button without navigating", () => {
    const onOpenChange = jest.fn();
    render(
      <LoginRequiredDialog
        open={true}
        onOpenChange={onOpenChange}
        redirectTo="/checkout/payment"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navigates to login with the given target remembered", () => {
    render(
      <LoginRequiredDialog
        open={true}
        onOpenChange={jest.fn()}
        redirectTo="/checkout/payment"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(pushMock).toHaveBeenCalledWith(
      "/login?redirect=%2Fcheckout%2Fpayment"
    );
  });
});
