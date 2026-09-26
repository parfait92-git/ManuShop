import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";

import { ManualOrderDialog } from "@/components/dashboard/ManualOrderDialog";
import type { Product } from "@/models/product/Product";

function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    shopId: "shop-1",
    name: "Wax",
    description: "",
    price: 5000,
    category: "Mode",
    images: [],
    stock: 10,
    stockThreshold: 2,
    isPromo: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

describe("ManualOrderDialog", () => {
  const onOpenChange = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <ManualOrderDialog
        open={false}
        onOpenChange={onOpenChange}
        products={[fakeProduct()]}
        submitting={false}
        onSubmit={onSubmit}
      />
    );
    expect(screen.queryByText("Nouvelle commande manuelle")).not.toBeInTheDocument();
  });

  it("keeps the submit button disabled until a client name and at least one item are set", async () => {
    const user = userEvent.setup();
    render(
      <ManualOrderDialog
        open
        onOpenChange={onOpenChange}
        products={[fakeProduct()]}
        submitting={false}
        onSubmit={onSubmit}
      />
    );

    expect(
      screen.getByRole("button", { name: "Créer la commande" })
    ).toBeDisabled();

    await user.type(screen.getByLabelText("Nom du client"), "Client de passage");
    expect(
      screen.getByRole("button", { name: "Créer la commande" })
    ).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Produit"), "p1");
    await user.click(screen.getByRole("button", { name: "Ajouter l'article" }));

    expect(
      screen.getByRole("button", { name: "Créer la commande" })
    ).toBeEnabled();
  });

  it("adds a line, shows the running total, and submits the built order", async () => {
    const user = userEvent.setup();
    render(
      <ManualOrderDialog
        open
        onOpenChange={onOpenChange}
        products={[fakeProduct()]}
        submitting={false}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText("Nom du client"), "Client de passage");
    await user.selectOptions(screen.getByLabelText("Produit"), "p1");
    fireEvent.change(screen.getByLabelText("Quantité"), { target: { value: "3" } });
    await user.click(screen.getByRole("button", { name: "Ajouter l'article" }));

    expect(screen.getByText(/Wax × 3/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Créer la commande" }));

    expect(onSubmit).toHaveBeenCalledWith({
      clientName: "Client de passage",
      clientPhone: "",
      clientAddress: "",
      items: [{ productId: "p1", name: "Wax", quantity: 3, unitPrice: 5000 }],
    });
  });

  it("removes a line before submitting", async () => {
    const user = userEvent.setup();
    render(
      <ManualOrderDialog
        open
        onOpenChange={onOpenChange}
        products={[fakeProduct()]}
        submitting={false}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText("Nom du client"), "Client de passage");
    await user.selectOptions(screen.getByLabelText("Produit"), "p1");
    await user.click(screen.getByRole("button", { name: "Ajouter l'article" }));

    expect(screen.getByText(/Wax × 1/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Retirer Wax"));

    expect(screen.queryByText(/Wax × 1/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Créer la commande" })
    ).toBeDisabled();
  });

  it("calls onOpenChange(false) when cancelling", async () => {
    const user = userEvent.setup();
    render(
      <ManualOrderDialog
        open
        onOpenChange={onOpenChange}
        products={[fakeProduct()]}
        submitting={false}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
