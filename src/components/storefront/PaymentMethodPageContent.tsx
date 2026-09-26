"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cartTotal, useCartStore } from "@/store/cartStore";

type PaymentMethod = "visa" | "orange-money" | "mtn-momo";

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "visa", label: "Visa / Mastercard" },
  { id: "orange-money", label: "Orange Money" },
  { id: "mtn-momo", label: "MTN Mobile Money" },
];

/**
 * BF-78 : interface de sélection du moyen de paiement uniquement — aucune
 * intégration réelle (voir 04-besoins-techniques.md §12.6). "Payer" ne
 * simule pas un succès trompeur : il informe honnêtement que ce n'est pas
 * encore disponible, et redirige vers le seul chemin qui fonctionne
 * réellement aujourd'hui (Commander via WhatsApp, CartPanel).
 */
export function PaymentMethodPageContent() {
  const items = useCartStore((state) => state.items);
  const [method, setMethod] = useState<PaymentMethod>("visa");
  const [fieldValue, setFieldValue] = useState("");
  const total = cartTotal(items);

  function handlePay() {
    toast.info(
      "Paiement non disponible pour le moment — utilisez « Commander via WhatsApp » depuis votre panier."
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-4xl font-bold">Choisir un paiement</h1>
        <p className="mt-1 text-muted-foreground">
          Total à payer · {total.toLocaleString("fr-FR")} FCFA
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {METHODS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMethod(option.id)}
            aria-pressed={method === option.id}
            className={`rounded-2xl border p-5 text-left transition-colors ${
              method === option.id
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/40"
            }`}
          >
            <p className="font-semibold">{option.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">Paiement sécurisé</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-5">
        <Label htmlFor="payment-field">
          {method === "visa" ? "Numéro de carte" : "Numéro de téléphone"}
        </Label>
        <Input
          id="payment-field"
          value={fieldValue}
          onChange={(event) => setFieldValue(event.target.value)}
          placeholder={method === "visa" ? "0000 0000 0000 0000" : "6 XX XX XX XX"}
          className="mt-2"
        />
        <Button className="mt-4 w-full" onClick={handlePay}>
          Payer {total.toLocaleString("fr-FR")} FCFA
        </Button>
      </div>
    </div>
  );
}
