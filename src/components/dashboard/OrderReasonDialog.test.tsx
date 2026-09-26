import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OrderReasonDialog } from "@/components/dashboard/OrderReasonDialog";

describe("OrderReasonDialog", () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing without a target", () => {
    render(
      <OrderReasonDialog target={null} onCancel={onCancel} onConfirm={onConfirm} />
    );
    expect(screen.queryByText("Annuler la commande")).not.toBeInTheDocument();
  });

  it("shows cancellation copy and requires a reason before confirming", async () => {
    const user = userEvent.setup();
    render(
      <OrderReasonDialog
        target={{ orderId: "o1", kind: "cancel" }}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Annuler la commande" })
    ).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "Annuler la commande" });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Motif..."), "Changement d'avis");
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith("Changement d'avis");
  });

  it("shows defective copy and calls onCancel from the back button", async () => {
    const user = userEvent.setup();
    render(
      <OrderReasonDialog
        target={{ orderId: "o1", kind: "defective" }}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText("Marquer comme défectueuse")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
