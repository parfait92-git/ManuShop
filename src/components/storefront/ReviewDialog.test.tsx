import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReviewDialog } from "./ReviewDialog";

const ONE_ITEM = [{ productId: "p1", name: "Sac", quantity: 1, unitPrice: 5000 }];
const TWO_ITEMS = [
  { productId: "p1", name: "Sac", quantity: 1, unitPrice: 5000 },
  { productId: "p2", name: "Chapeau", quantity: 1, unitPrice: 3000 },
];

describe("ReviewDialog", () => {
  const onCancel = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing without a target", () => {
    render(
      <ReviewDialog target={null} onCancel={onCancel} onSubmit={onSubmit} />
    );
    expect(screen.queryByText("Laisser un avis")).not.toBeInTheDocument();
  });

  it("does not offer an article picker for a single-item order", () => {
    render(
      <ReviewDialog
        target={{ orderId: "o1", items: ONE_ITEM }}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    expect(screen.queryByLabelText("Article concerné")).not.toBeInTheDocument();
  });

  it("offers an article picker for a multi-item order, defaulting to the first", async () => {
    const user = userEvent.setup();
    render(
      <ReviewDialog
        target={{ orderId: "o1", items: TWO_ITEMS }}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    const picker = screen.getByLabelText(
      "Article concerné"
    ) as HTMLSelectElement;
    expect(picker.value).toBe("p1");

    await user.type(screen.getByPlaceholderText("Votre avis..."), "Top");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "p1" })
    );
  });

  it("requires a comment before the send button is enabled", () => {
    render(
      <ReviewDialog
        target={{ orderId: "o1", items: ONE_ITEM }}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
  });

  it("submits the chosen rating, comment and defective flag", async () => {
    const user = userEvent.setup();
    render(
      <ReviewDialog
        target={{ orderId: "o1", items: ONE_ITEM }}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole("radio", { name: "4 étoiles" }));
    await user.type(
      screen.getByPlaceholderText("Votre avis..."),
      "Cassé à la réception"
    );
    await user.click(screen.getByLabelText("Signaler un article défectueux"));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(onSubmit).toHaveBeenCalledWith({
      productId: "p1",
      rating: 4,
      comment: "Cassé à la réception",
      reason: "defective",
    });
  });

  it("omits the rating and reason when neither is set", async () => {
    const user = userEvent.setup();
    render(
      <ReviewDialog
        target={{ orderId: "o1", items: ONE_ITEM }}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByPlaceholderText("Votre avis..."), "Correct");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(onSubmit).toHaveBeenCalledWith({
      productId: "p1",
      rating: undefined,
      comment: "Correct",
      reason: undefined,
    });
  });

  it("calls onCancel", async () => {
    const user = userEvent.setup();
    render(
      <ReviewDialog
        target={{ orderId: "o1", items: ONE_ITEM }}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
