// Visite guidée de la fenêtre (BF-134/135, testée dans onboarding/) : elle
// charge le SDK Firebase via useAuth et se lancerait sur le profil de test.
jest.mock("../onboarding/DialogTour", () => ({ DialogTour: () => null }));

// react-easy-crop mesure le DOM (indisponible sous jsdom) : remplacé par un
// bouton qui simule la fin du chargement de la photo et du recadrage.
jest.mock("react-easy-crop", () => ({
  __esModule: true,
  default: ({
    onMediaLoaded,
    onCropComplete,
  }: {
    onMediaLoaded: () => void;
    onCropComplete: (area: unknown, pixels: unknown) => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onMediaLoaded();
        onCropComplete({}, { x: 0, y: 0, width: 10, height: 10 });
      }}
    >
      fake-cropper
    </button>
  ),
}));

import { fireEvent, render, screen } from "@testing-library/react";

import { ImageCropDialog } from "./ImageCropDialog";

function loadMedia() {
  fireEvent.click(screen.getByRole("button", { name: "fake-cropper" }));
}

describe("ImageCropDialog", () => {
  it("shows a loader and blocks validation until the photo is decoded", () => {
    const onConfirm = jest.fn();
    render(
      <ImageCropDialog imageSrc="blob:photo" onCancel={jest.fn()} onConfirm={onConfirm} />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Chargement de la photo...");
    expect(screen.getByRole("button", { name: "Valider le recadrage" })).toBeDisabled();

    loadMedia();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Valider le recadrage" }));
    expect(onConfirm).toHaveBeenCalledWith({ x: 0, y: 0, width: 10, height: 10 });
  });

  it("shows the current processing step and locks every action while busy (no double upload, no closing mid-upload)", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <ImageCropDialog
        imageSrc="blob:photo"
        onCancel={onCancel}
        onConfirm={onConfirm}
        busyLabel="Envoi de la photo..."
      />
    );
    loadMedia();

    expect(screen.getByRole("status")).toHaveTextContent("Envoi de la photo...");
    expect(screen.getByRole("button", { name: "Traitement..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
    expect(screen.getByLabelText("Zoom")).toBeDisabled();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
