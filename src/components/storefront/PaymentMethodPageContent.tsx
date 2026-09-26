"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useShop } from "@/hooks/useShop";
import { cartTotal, useCartStore } from "@/store/cartStore";
import { orderService } from "@/services/OrderService";

type PaymentMethod = "visa" | "orange-money" | "mtn-momo";

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "visa", label: "Visa / Mastercard" },
  { id: "orange-money", label: "Orange Money" },
  { id: "mtn-momo", label: "MTN Mobile Money" },
];

const METHOD_LABEL: Record<PaymentMethod, string> = {
  visa: "Visa / Mastercard",
  "orange-money": "Orange Money",
  "mtn-momo": "MTN Mobile Money",
};

/**
 * BF-78/BF-19 : sélection du moyen de paiement (toujours sans intégration
 * réelle — voir 04-besoins-techniques.md §12.6) + coordonnées de livraison.
 * "Confirmer ma commande" (ex-"Payer", 2026-09-25) enregistre une vraie
 * commande dans Firestore — paiement à la livraison en attendant une
 * intégration réelle, plutôt que de bloquer BF-19 sur BF-78.
 */
export function PaymentMethodPageContent() {
  const router = useRouter();
  const { profile } = useAuth();
  const { shop } = useShop();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const total = cartTotal(items);

  const [method, setMethod] = useState<PaymentMethod>("visa");
  const [fieldValue, setFieldValue] = useState("");
  const [clientName, setClientName] = useState(profile?.displayName ?? "");
  const [clientPhone, setClientPhone] = useState(profile?.phone ?? "");
  const [clientAddress, setClientAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    items.length > 0 &&
    !!clientName.trim() &&
    !!clientPhone.trim() &&
    !!clientAddress.trim();

  async function handleConfirm() {
    if (!shop || !canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await orderService.createOrder({
        shopId: shop.id,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientAddress: clientAddress.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        subtotal: total,
        total,
        notes: `Méthode choisie : ${METHOD_LABEL[method]} (paiement à la livraison, aucune intégration réelle).`,
      });
      clear();
      toast.success("Commande enregistrée ! Le commerçant va la préparer.");
      router.push("/mes-commandes");
    } catch {
      setError("Échec de l'enregistrement de la commande. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-10 text-center">
        <h1 className="text-2xl font-semibold">Votre panier est vide</h1>
        <p className="text-muted-foreground">
          Ajoutez des articles au panier avant de passer commande.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-4xl font-bold">Confirmer ma commande</h1>
        <p className="mt-1 text-muted-foreground">
          Total · {total.toLocaleString("fr-FR")} FCFA
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-5">
        <h2 className="font-semibold">Livraison</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-name">Nom</Label>
          <Input
            id="client-name"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-phone">Téléphone</Label>
          <PhoneInput
            id="client-phone"
            value={clientPhone}
            onChange={setClientPhone}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-address">Adresse de livraison</Label>
          <Input
            id="client-address"
            value={clientAddress}
            onChange={(event) => setClientAddress(event.target.value)}
            placeholder="Quartier, ville, point de repère..."
          />
        </div>
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
        <p className="mt-2 text-xs text-muted-foreground">
          Aucune intégration de paiement réelle pour l&apos;instant — la
          commande est enregistrée, le paiement se fait à la livraison.
        </p>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button
          className="mt-4 w-full"
          disabled={!canSubmit || submitting}
          onClick={handleConfirm}
        >
          {submitting
            ? "Enregistrement..."
            : `Confirmer ma commande · ${total.toLocaleString("fr-FR")} FCFA`}
        </Button>
      </div>
    </div>
  );
}
