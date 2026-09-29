import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GuidedTour } from "./GuidedTour";

describe("GuidedTour", () => {
  it("renders without crashing when run is false", () => {
    render(
      <GuidedTour
        run={false}
        steps={[{ target: "body", content: "Bonjour" }]}
        onFinish={jest.fn()}
      />
    );
  });

  it("shows the step content once running", async () => {
    render(
      <GuidedTour
        run={true}
        steps={[{ target: "body", content: "Bonjour", placement: "center" }]}
        onFinish={jest.fn()}
      />
    );

    expect(await screen.findByText("Bonjour")).toBeInTheDocument();
  });

  it("calls onFinish when the tour is skipped", async () => {
    const onFinish = jest.fn();
    const user = userEvent.setup();
    render(
      <GuidedTour
        run={true}
        steps={[
          { target: "body", content: "Étape 1", placement: "center" },
          { target: "body", content: "Étape 2", placement: "center" },
        ]}
        onFinish={onFinish}
      />
    );

    await user.click(await screen.findByRole("button", { name: "Passer" }));

    expect(onFinish).toHaveBeenCalled();
  }, 15000); // repositionnement asynchrone (floating-ui) plus lent sous la suite complète en parallèle
});
