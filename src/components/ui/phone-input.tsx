"use client";

import "react-phone-number-input/style.css";

import { useState } from "react";
import ReactPhoneNumberInput, {
  getCountryCallingCode,
  parsePhoneNumber,
  type Country,
} from "react-phone-number-input";
import frLabels from "react-phone-number-input/locale/fr.json";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export const DEFAULT_PHONE_COUNTRY: Country = "CM";

/**
 * Pays réellement pris en charge (demande explicite de l'utilisateur :
 * "pour le moment prenons en compte juste 3 numéros de téléphone : Cameroun,
 * USA, Canada") — restreint le sélecteur de pays à ces trois-là plutôt que
 * la liste mondiale par défaut de `react-phone-number-input`. Limite la
 * surface qu'il faut vraiment tester/supporter (WhatsApp Business, SMS...)
 * plutôt que de prétendre couvrir n'importe quel pays sans l'avoir vérifié.
 */
export const SUPPORTED_PHONE_COUNTRIES: Country[] = ["CM", "US", "CA"];

/** Exemple de numéro national affiché dans le second bloc, selon le pays
 * choisi dans le premier — sans l'indicatif, qui a son propre bloc. */
const NATIONAL_EXAMPLE: Partial<Record<Country, string>> = {
  CM: "6 71 23 45 67",
  US: "(201) 555-0123",
  CA: "(506) 234-5678",
};

/** Pays d'une valeur déjà enregistrée, sinon le pays par défaut. */
function countryOf(value: string, fallback: Country): Country {
  if (!value) return fallback;
  try {
    const country = parsePhoneNumber(value)?.country;
    return country && SUPPORTED_PHONE_COUNTRIES.includes(country) ? country : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Adapte notre `<Select>` (stylé comme le reste de l'app) à la signature
 * attendue par `countrySelectComponent` de `react-phone-number-input`
 * (`onChange(value)` reçoit directement la valeur, pas un événement — à la
 * différence d'un `<select>` natif).
 */
function CountrySelect({
  value,
  onChange,
  options,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value?: Country;
  onChange: (value: Country | undefined) => void;
  options: { value?: Country; label: string }[];
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      value={value ?? ""}
      disabled={disabled}
      className={className}
      onChange={(event) =>
        onChange((event.target.value || undefined) as Country | undefined)
      }
    >
      {options.map((option) =>
        option.value ? (
          <option key={option.value} value={option.value}>
            +{getCountryCallingCode(option.value)} {option.label}
          </option>
        ) : null
      )}
    </Select>
  );
}

/**
 * Champ téléphone en **deux blocs séparés** (demande de l'utilisateur,
 * 2026-10-02) : l'indicatif du pays dans un sélecteur, le numéro national
 * seul dans le champ texte (`international={false}`). Auparavant, le champ
 * texte affichait le numéro au format international, indicatif compris
 * ("+237 6 90…") : l'indicatif apparaissait deux fois, et effacer le champ
 * pour taper son numéro supprimait aussi l'indicatif — un "690000000" tapé
 * ainsi devenait "+690000000", un numéro invalide. La valeur émise reste
 * complète, au format E.164 ("+237690000000").
 *
 * Basé sur `react-phone-number-input`
 * (construit sur `libphonenumber-js`, comme la version maison précédente) :
 * formatage et longueur maximale gérés par la bibliothèque elle-même
 * (`limitMaxLength`), avec une meilleure gestion du curseur en édition
 * médiane que ce qu'une implémentation maison aurait raisonnablement
 * couvert. Seuls le champ numéro et le sélecteur de pays sont personnalisés
 * (via `inputComponent`/`countrySelectComponent`) pour garder l'apparence du
 * reste de l'app — le formatage lui-même suit la convention propre à chaque
 * pays (espaces, tirets, parenthèses...), pas un séparateur uniforme.
 *
 * Composant contrôlé (`value`/`onChange`), pas branché sur `register()` —
 * même convention que `Switch` ailleurs dans le projet.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  defaultCountry = DEFAULT_PHONE_COUNTRY,
  "aria-invalid": ariaInvalid,
  placeholder,
}: {
  id?: string;
  /** Valeur E.164, ex. `"+237600000000"`, ou `""`. */
  value: string;
  onChange: (e164: string) => void;
  defaultCountry?: Country;
  "aria-invalid"?: boolean;
  placeholder?: string;
}) {
  // Suivi du pays choisi, pour adapter l'exemple affiché dans le numéro.
  const [country, setCountry] = useState<Country>(() => countryOf(value, defaultCountry));

  return (
    <ReactPhoneNumberInput
      id={id}
      aria-invalid={ariaInvalid}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      defaultCountry={defaultCountry}
      onCountryChange={(next) => next && setCountry(next)}
      countries={SUPPORTED_PHONE_COUNTRIES}
      international={false}
      limitMaxLength
      addInternationalOption={false}
      labels={frLabels}
      placeholder={placeholder ?? NATIONAL_EXAMPLE[country]}
      inputComponent={Input}
      countrySelectComponent={CountrySelect}
      // Deux blocs côte à côte quand la place le permet ; sinon (petit
      // téléphone, police agrandie), le numéro passe sous l'indicatif plutôt
      // que d'être écrasé — il garde une largeur minimale lisible.
      numberInputProps={{
        className: "min-w-40 flex-1",
        inputMode: "tel",
        autoComplete: "tel-national",
      }}
      countrySelectProps={{
        className: "w-auto max-w-full shrink-0",
        "aria-label": "Indicatif du pays",
      }}
      className="flex flex-wrap gap-2"
    />
  );
}
