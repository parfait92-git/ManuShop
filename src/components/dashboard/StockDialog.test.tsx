jest.mock("../onboarding/DialogTour", () => ({ DialogTour: () => null }));

let mockRole = "admin";
jest.mock("../providers/AuthProvider", () => ({
  useAuth: () => ({ profile: { id: "u1", role: mockRole } }),
}));

const toastSuccessMock = jest.fn();
jest.mock("sonner", () => ({ toast: { success: (...args: unknown[]) => toastSuccessMock(...args) } }));

const restockMock = jest.fn();
const adjustMock = jest.fn();
const listProductHistoryMock = jest.fn();
jest.mock("../../services/StockService", () => ({
  stockService: {
    restock: (...args: unknown[]) => restockMock(...args),
    adjust: (...args: unknown[]) => adjustMock(...args),
    listProductHistory: (...args: unknown[]) => listProductHistoryMock(...args),
  },
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StockDialog } from "@/components/dashboard/StockDialog";
import type { Product } from "@/models/product/Product";
import type { StockMovement } from "@/models/stock/StockMovement";

const product = {
  id: "p1",
  shopId: "shop-1",
  name: "Pagne wax",
  stock: 4,
  stockThreshold: 1,
} as Product;

const at = (iso: string) => ({ toDate: () => new Date(iso), toMillis: () => Date.parse(iso) }) as StockMovement["createdAt"];

function renderDialog() {
  const onStockChange = jest.fn();
  render(<StockDialog product={product} onClose={jest.fn()} onStockChange={onStockChange} />);
  return { onStockChange, user: userEvent.setup() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = "admin";
  listProductHistoryMock.mockResolvedValue([]);
});

describe("StockDialog", () => {
  it("restocks with the note and the new purchase price, then shows the new stock and the history", async () => {
    restockMock.mockResolvedValue(16);
    const { onStockChange, user } = renderDialog();

    await user.type(screen.getByLabelText("Quantité reçue"), "12");
    expect(screen.getByText("Nouveau stock : 16")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Prix d'achat unitaire (FCFA)"), "1500");
    await user.type(screen.getByLabelText("Note"), "Fournisseur Akwa");
    await user.click(screen.getByRole("button", { name: "Ajouter au stock" }));

    await waitFor(() =>
      expect(restockMock).toHaveBeenCalledWith({
        productId: "p1",
        quantity: 12,
        note: "Fournisseur Akwa",
        purchasePrice: 1500,
      })
    );
    expect(onStockChange).toHaveBeenCalledWith("p1", 16);
    expect(screen.getByTestId("current-stock")).toHaveTextContent("16");
    expect(screen.getByRole("tab", { name: "Historique" })).toHaveAttribute("aria-selected", "true");
    expect(listProductHistoryMock).toHaveBeenCalledTimes(2);
  });

  it("never offers the purchase price to a seller", () => {
    mockRole = "seller";
    renderDialog();
    expect(screen.queryByLabelText("Prix d'achat unitaire (FCFA)")).not.toBeInTheDocument();
  });

  it("keeps the restock button off until a whole quantity is entered", async () => {
    const { user } = renderDialog();
    const submit = screen.getByRole("button", { name: "Ajouter au stock" });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText("Quantité reçue"), "2,5");
    expect(submit).toBeDisabled();
  });

  it("corrects the stock to the counted quantity, with a required reason, and shows the gap", async () => {
    adjustMock.mockResolvedValue(1);
    const { user } = renderDialog();

    await user.click(screen.getByRole("tab", { name: "Corriger" }));
    await user.type(screen.getByLabelText("Quantité comptée"), "1");
    expect(screen.getByText("Écart : -3")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Corriger le stock" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Motif"), "3 pagnes abîmés");
    await user.click(submit);

    await waitFor(() =>
      expect(adjustMock).toHaveBeenCalledWith({ productId: "p1", countedStock: 1, note: "3 pagnes abîmés" })
    );
  });

  it("shows the server's refusal", async () => {
    restockMock.mockRejectedValue(new Error("Ce produit est dans la corbeille : restaurez-le d'abord."));
    const { user } = renderDialog();

    await user.type(screen.getByLabelText("Quantité reçue"), "1");
    await user.click(screen.getByRole("button", { name: "Ajouter au stock" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("restaurez-le d'abord");
  });

  it("lists each movement with its label, change, stock after, author, order and note", async () => {
    listProductHistoryMock.mockResolvedValue([
      {
        id: "m2",
        type: "order",
        quantity: -2,
        stockAfter: 4,
        orderId: "abcdefgh123",
        createdAt: at("2026-10-03T10:00:00Z"),
      },
      {
        id: "m1",
        type: "restock",
        quantity: 6,
        stockAfter: 6,
        actorName: "Awa",
        note: "Fournisseur Akwa",
        createdAt: at("2026-10-02T09:00:00Z"),
      },
    ] as StockMovement[]);
    const { user } = renderDialog();

    await user.click(screen.getByRole("tab", { name: "Historique" }));

    expect(await screen.findByText("Commande")).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
    expect(screen.getByText("Commande n° ABCDEFGH")).toBeInTheDocument();
    expect(screen.getByText("Réapprovisionnement")).toBeInTheDocument();
    expect(screen.getByText("+6")).toBeInTheDocument();
    expect(screen.getByText(/· Awa/)).toBeInTheDocument();
    expect(screen.getByText("« Fournisseur Akwa »")).toBeInTheDocument();
    expect(screen.getByText("Stock après : 6")).toBeInTheDocument();
  });

  it("explains that movements before the history started aren't listed", async () => {
    const { user } = renderDialog();
    await user.click(screen.getByRole("tab", { name: "Historique" }));
    expect(await screen.findByText(/L'historique commence le 3 octobre 2026/)).toBeInTheDocument();
  });

  it("restocks and corrects one version at a time, keeping the total", async () => {
    restockMock.mockResolvedValue(6);
    const onStockChange = jest.fn();
    const user = userEvent.setup();
    render(
      <StockDialog
        product={
          {
            ...product,
            stock: 6,
            variantName: "Contenance",
            variants: { a: { label: "250 ml", stock: 4, position: 0 }, b: { label: "500 ml", stock: 2, position: 1 } },
          } as Product
        }
        onClose={jest.fn()}
        onStockChange={onStockChange}
      />
    );

    const select = screen.getByRole("combobox", { name: /Contenance/ });
    expect(select).toHaveValue("a");
    await user.selectOptions(select, "b");
    await user.type(screen.getByLabelText("Quantité reçue"), "4");
    expect(screen.getByText("Nouveau stock (500 ml) : 6")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ajouter au stock" }));

    await waitFor(() => expect(restockMock).toHaveBeenCalledWith(expect.objectContaining({ productId: "p1", variantId: "b", quantity: 4 })));
    expect(onStockChange).toHaveBeenCalledWith("p1", 10, { b: 6 });
    expect(screen.getByTestId("current-stock")).toHaveTextContent("10");
    expect(screen.getByRole("option", { name: "500 ml — 6 en stock" })).toBeInTheDocument();
  });
});
