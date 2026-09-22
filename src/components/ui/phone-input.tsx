"use client";

import "react-phone-number-input/style.css";

import ReactPhoneNumberInput, {
  getCountryCallingCode,
  type Country,
} from "react-phone-number-input";
import frLabels from "react-phone-number-input/locale/fr.json";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export const DEFAULT_PHONE_COUNTRY: Country = "CM";

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
 * Champ téléphone international basé sur `react-phone-number-input`
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
  return (
    <ReactPhoneNumberInput
      id={id}
      aria-invalid={ariaInvalid}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      defaultCountry={defaultCountry}
      international
      limitMaxLength
      addInternationalOption={false}
      labels={frLabels}
      placeholder={placeholder}
      inputComponent={Input}
      countrySelectComponent={CountrySelect}
      numberInputProps={{ className: "min-w-0 flex-1" }}
      countrySelectProps={{
        className: "w-28 shrink-0 sm:w-36",
        "aria-label": "Indicatif du pays",
      }}
      className="flex gap-2"
    />
  );
}
