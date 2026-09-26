"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCurrentShop } from "@/hooks/useCurrentShop";
import { shopService } from "@/services/ShopService";

/**
 * Bandeau persistant (BF-88), affiché sur toutes les pages de la coquille
 * commerçant tant que la boutique n'est pas publiée. Aujourd'hui, aucune
 * autre UI ne permet de publier une boutique — sans ce bouton, une boutique
 * réelle reste bloquée en permanence sur `/demo-catalogue` (voir
 * `06-journal-progression.md`).
 */
export function PublicationBanner() {
  const { shop } = useCurrentShop();
  const [publishing, setPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  if (!shop || shop.isPublished || justPublished) return null;

  async function handlePublish() {
    if (!shop) return;
    setPublishing(true);
    try {
      await shopService.updateProfile(shop.id, { isPublished: true });
      setJustPublished(true);
      toast.success("Votre boutique est maintenant visible par vos clients.");
    } catch {
      toast.error("Échec de la publication. Réessayez.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            Votre boutique n&apos;est pas encore visible par vos clients
          </p>
          <p className="text-sm text-amber-800/80">
            Publiez-la quand vos produits et paramètres sont prêts.
          </p>
        </div>
      </div>
      <Button
        onClick={handlePublish}
        disabled={publishing}
        className="w-full shrink-0 bg-amber-600 hover:bg-amber-700 sm:w-auto"
      >
        {publishing ? "Publication..." : "Publier ma boutique"}
      </Button>
    </div>
  );
}
