import { render, screen } from "@testing-library/react";

import { TourReplayButton } from "./TourReplayButton";

describe("TourReplayButton", () => {
  it("is hidden on a page without a guided tour", () => {
    render(<TourReplayButton />);
    expect(
      screen.queryByRole("button", { name: /Revoir la visite/ })
    ).not.toBeInTheDocument();
  });
});
