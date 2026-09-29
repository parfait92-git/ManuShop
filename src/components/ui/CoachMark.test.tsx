import { render, screen } from "@testing-library/react";

import { CoachMark } from "./CoachMark";

// BF-136 : bulle d'aide affichée à la demande (clic), pas au survol —
// contrairement à FieldHint (title natif), pour fonctionner sur mobile.
//
// Un seul test ici, volontairement statique : simuler l'ouverture du
// `Popover` Base UI dans jsdom (fireEvent + `elementFromPoint` mocké)
// fonctionne pour l'assertion elle-même, mais laisse ensuite un abonnement
// (repositionnement `floating-ui`) qui ne se résorbe jamais tout seul dans
// jsdom — le test finit par passer, mais seulement avec `--forceExit` et
// ~50s d'attente, inutilisable dans la suite normale. Le mécanisme
// d'ouverture est délégué à Base UI (bibliothèque déjà utilisée ailleurs
// dans l'app pour `Dialog`/`Switch`) ; seule la composition propre à ce
// composant (label du déclencheur, contenu masqué par défaut) est testée
// ici.
describe("CoachMark", () => {
  it("hides the help text until the trigger is activated", () => {
    render(<CoachMark label="À propos du stock">Texte d&apos;aide.</CoachMark>);

    expect(screen.queryByText("Texte d'aide.")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "À propos du stock" })
    ).toBeInTheDocument();
  });
});
