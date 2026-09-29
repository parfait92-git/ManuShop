"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildAuthHref } from "@/lib/redirectParam";

/**
 * Avertissement avant de passer commande sans être connecté (demande
 * explicite de l'utilisateur, 2026-09-29) — rassure sur le panier (déjà
 * persistant, `cartStore`, mais l'utilisateur ne le sait pas) plutôt que de
 * rediriger silencieusement (`ProtectedRoute` le ferait sinon vers
 * `/catalogue`, sans explication). "Se connecter" mémorise la page de
 * paiement dans `?redirect=`, consommé par `LoginForm` après connexion.
 */
export function LoginRequiredDialog({
  open,
  onOpenChange,
  redirectTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Page à rejoindre une fois connecté, ex. "/checkout/payment". */
  redirectTo: string;
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal className="max-w-sm">
        <DialogTitle>Connectez-vous pour continuer</DialogTitle>
        <DialogDescription>
          Vous devez être connecté(e) pour passer votre commande. Pas
          d&apos;inquiétude : les articles de votre panier resteront
          enregistrés.
        </DialogDescription>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() =>
              router.push(buildAuthHref("/login", redirectTo))
            }
          >
            Se connecter
          </Button>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
