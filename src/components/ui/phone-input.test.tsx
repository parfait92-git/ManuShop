import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { PhoneInput } from "./phone-input";

// `<output>` expose la valeur E.164 réellement portée par le contrat
// value/onChange du composant — indépendante du formatage visuel affiché
// dans le champ texte (géré par `react-phone-number-input`).
function ControlledPhoneInput({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <PhoneInput id="phone" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </div>
  );
}

describe("PhoneInput", () => {
  it("defaults to Cameroun and emits an E.164 value as the user types", async () => {
    const user = userEvent.setup();
    render(<ControlledPhoneInput />);

    expect(
      (screen.getByLabelText("Indicatif du pays") as HTMLSelectElement).value
    ).toBe("CM");

    await user.type(screen.getByRole("textbox"), "690000000");

    expect(screen.getByTestId("value")).toHaveTextContent("+237690000000");
  });

  it("formats the number visually using the country's own grouping", async () => {
    const user = userEvent.setup();
    render(<ControlledPhoneInput />);

    await user.type(screen.getByRole("textbox"), "690000000");

    // La bibliothèque regroupe les chiffres selon la convention propre au
    // pays (espaces pour le Cameroun), pas un séparateur uniforme imposé.
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toContain(
      " "
    );
  });

  it("resets the number when a different country is selected", async () => {
    const user = userEvent.setup();
    render(<ControlledPhoneInput />);

    await user.type(screen.getByRole("textbox"), "612345678");
    await user.selectOptions(
      screen.getByLabelText("Indicatif du pays"),
      "FR"
    );

    expect(
      (screen.getByLabelText("Indicatif du pays") as HTMLSelectElement).value
    ).toBe("FR");
    // Changer de pays repart d'un numéro vierge sous le nouvel indicatif —
    // le champ ne réinterprète pas les chiffres déjà saisis.
    expect(screen.getByTestId("value")).toHaveTextContent("+33");
  });

  it("pre-fills the country and number from an existing E.164 value", () => {
    render(<ControlledPhoneInput initial="+237690000000" />);

    expect(
      (screen.getByLabelText("Indicatif du pays") as HTMLSelectElement).value
    ).toBe("CM");
    expect(screen.getByTestId("value")).toHaveTextContent("+237690000000");
  });

  it("emits an empty string when the field is cleared", async () => {
    const user = userEvent.setup();
    render(<ControlledPhoneInput initial="+237690000000" />);

    await user.clear(screen.getByRole("textbox"));

    expect(screen.getByTestId("value")).toHaveTextContent("");
  });

  it("caps input at the country's real maximum length instead of a fixed template", async () => {
    const user = userEvent.setup();
    render(<ControlledPhoneInput />);

    // Le Cameroun n'a que 9 chiffres nationaux ; les chiffres en trop ne
    // doivent pas être pris en compte.
    await user.type(screen.getByRole("textbox"), "6900000009999");

    expect(screen.getByTestId("value")).toHaveTextContent("+237690000000");
  });

  it("allows more digits for a country with a longer national number (Canada)", async () => {
    const user = userEvent.setup();
    render(<ControlledPhoneInput />);

    await user.selectOptions(screen.getByLabelText("Indicatif du pays"), "CA");
    await user.type(screen.getByRole("textbox"), "41655512349999");

    expect(screen.getByTestId("value")).toHaveTextContent("+14165551234");
  });
});
