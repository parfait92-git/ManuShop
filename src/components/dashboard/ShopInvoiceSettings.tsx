"use client";

import { Check, FileText } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CAMEROON_VAT_RATE,
  INVOICE_COLOR_PRESETS,
  isHexColor,
} from "@/lib/invoice";
import type { ShopSettingsInput } from "@/lib/validation/auth";

/**
 * Section « Facturation » des Paramètres (2026-10-03) : couleur des
 * factures, taux de TVA, NIU et RCCM. Une facture fige ces réglages à son
 * émission (à la livraison) : un changement ne s'applique qu'aux factures
 * suivantes.
 */
export function ShopInvoiceSettings({
  color,
  onColorChange,
  register,
  errors,
}: {
  color: string;
  onColorChange: (color: string) => void;
  register: UseFormRegister<ShopSettingsInput>;
  errors: FieldErrors<ShopSettingsInput>;
}) {
  const current = isHexColor(color) ? color.toUpperCase() : "";

  return (
    <section
      data-tour="shop-invoice"
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileText className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold hyphens-auto break-words">Facturation</h2>
          <p className="text-sm text-muted-foreground">
            Chaque commande livrée reçoit sa facture PDF, que vous et votre client pouvez
            télécharger. Un changement ici vaut pour les factures suivantes.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="themeColor"
          help="La couleur de vos factures : titre, en-tête du tableau, total et bandeau du bas. Choisissez celle de votre logo ou de votre enseigne."
        >
          Couleur de la boutique
        </Label>
        <div role="radiogroup" aria-label="Couleurs proposées" className="flex flex-wrap gap-2">
          {INVOICE_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={current === preset.value}
              aria-label={preset.label}
              title={preset.label}
              onClick={() => onColorChange(preset.value)}
              className="flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-checked:ring-2 aria-checked:ring-foreground"
              style={{ backgroundColor: preset.value }}
            >
              {current === preset.value && <Check className="size-4 text-white" aria-hidden />}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="themeColor"
            type="color"
            value={current || "#3B5BA5"}
            onChange={(event) => onColorChange(event.target.value.toUpperCase())}
            className="h-9 w-14 cursor-pointer rounded-md border border-border bg-background p-1"
          />
          <span className="text-sm text-muted-foreground">
            Autre couleur : {current || "aucune"}
          </span>
        </div>
        {errors.themeColor && (
          <p className="text-sm text-destructive">{errors.themeColor.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 sm:max-w-64">
        <Label
          htmlFor="vatRate"
          help={`Laissez 0 si vous n'êtes pas assujetti à la TVA : la facture portera « TVA non applicable ». Sinon, indiquez votre taux (${CAMEROON_VAT_RATE.toLocaleString("fr-FR")} % au Cameroun). Vos prix restent ceux que paient vos clients (TTC) : la facture en déduit le HT et la TVA.`}
        >
          Taux de TVA (%)
        </Label>
        <Input
          id="vatRate"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.01}
          aria-invalid={!!errors.vatRate}
          {...register("vatRate", {
            setValueAs: (value: string | number) =>
              value === "" ? 0 : typeof value === "number" ? value : Number(value.replace(",", ".")),
          })}
        />
        {errors.vatRate && <p className="text-sm text-destructive">{errors.vatRate.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="taxId"
            help="Numéro d'identifiant unique du contribuable, facultatif. Imprimé au bas de vos factures s'il est rempli."
          >
            NIU (facultatif)
          </Label>
          <Input id="taxId" maxLength={40} aria-invalid={!!errors.taxId} {...register("taxId")} />
          {errors.taxId && <p className="text-sm text-destructive">{errors.taxId.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="tradeRegister"
            help="Numéro au registre du commerce et du crédit mobilier, facultatif. Imprimé au bas de vos factures s'il est rempli."
          >
            RCCM (facultatif)
          </Label>
          <Input
            id="tradeRegister"
            maxLength={40}
            aria-invalid={!!errors.tradeRegister}
            {...register("tradeRegister")}
          />
          {errors.tradeRegister && (
            <p className="text-sm text-destructive">{errors.tradeRegister.message}</p>
          )}
        </div>
      </div>
    </section>
  );
}
