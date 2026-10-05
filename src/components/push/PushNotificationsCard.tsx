"use client";

import { BellRing, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { pushAvailability, type PushAvailability } from "@/lib/push";
import { pushService } from "@/services/PushService";

/** Ce que reçoit chaque rôle (texte d'explication). */
const WHAT_YOU_GET: Record<string, string> = {
  client: "le suivi de vos commandes (prête, en route, livrée) et les réponses des boutiques à vos avis",
  admin:
    "les nouvelles commandes, les stocks qui baissent, les avis clients, les promotions qui se terminent et les réponses de l'équipe ManuShop",
  seller: "les nouvelles commandes, les stocks qui baissent, les avis clients et les promotions qui se terminent",
};

const UNAVAILABLE: Record<Exclude<PushAvailability, "available">, string> = {
  unsupported: "Ce navigateur ne permet pas les notifications. Essayez avec Chrome, Edge ou Firefox, ou installez ManuShop sur votre téléphone.",
  "install-required":
    "Sur iPhone et iPad, les notifications ne fonctionnent qu'une fois ManuShop installée : touchez Partager, puis « Sur l'écran d'accueil », et ouvrez ManuShop depuis son icône.",
  "not-configured": "Les notifications ne sont pas encore disponibles sur ManuShop. Elles arrivent bientôt.",
};

/**
 * Notifications push sur cet appareil (BF-61, 2026-10-04) : activation
 * (demande d'autorisation du navigateur), désactivation, et notification
 * d'essai. Le choix vaut pour cet appareil ; chaque téléphone ou
 * ordinateur s'active séparément.
 */
export function PushNotificationsCard() {
  const { profile } = useAuth();
  const [availability, setAvailability] = useState<PushAvailability | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    pushAvailability().then((value) => {
      if (!active) return;
      setAvailability(value);
      setEnabled(value === "available" && pushService.isEnabledHere());
      setBlocked(typeof Notification !== "undefined" && Notification.permission === "denied");
    });
    return () => {
      active = false;
    };
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        const ok = await pushService.enable();
        setEnabled(ok);
        setBlocked(!ok && Notification.permission === "denied");
        if (ok) toast.success("Notifications activées sur cet appareil.");
      } else {
        await pushService.disable();
        setEnabled(false);
        toast.success("Notifications désactivées sur cet appareil.");
      }
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Les notifications n'ont pas pu être modifiées.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const sent = await pushService.sendTest();
      if (sent > 0) toast.success("Notification d'essai envoyée.");
      else toast.error("Aucun appareil n'a pu être joint. Désactivez puis réactivez les notifications.");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "L'envoi a échoué.");
    } finally {
      setBusy(false);
    }
  }

  const role = profile?.role ?? "client";

  return (
    <section
      data-tour="account-push"
      aria-labelledby="push-title"
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BellRing className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="push-title" className="text-lg font-semibold">
            Notifications sur cet appareil
          </h2>
          <p className="text-sm text-muted-foreground">
            Recevez {WHAT_YOU_GET[role] ?? WHAT_YOU_GET.client}, même quand ManuShop est fermée.
          </p>
        </div>
      </div>

      {availability === null ? (
        <p className="text-sm text-muted-foreground">Vérification de l&apos;appareil…</p>
      ) : availability !== "available" ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{UNAVAILABLE[availability]}</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <label htmlFor="push-toggle" className="text-sm font-medium">
              Recevoir les notifications sur cet appareil
            </label>
            <Switch id="push-toggle" checked={enabled} disabled={busy} onCheckedChange={toggle} />
          </div>
          {blocked && (
            <p role="alert" className="text-sm text-destructive">
              Les notifications sont bloquées pour ManuShop. Autorisez-les dans les réglages du navigateur (icône à
              gauche de l&apos;adresse), puis réessayez.
            </p>
          )}
          {enabled && (
            <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" disabled={busy} onClick={sendTest}>
              <Send className="size-4" aria-hidden /> Envoyer une notification d&apos;essai
            </Button>
          )}
        </>
      )}
    </section>
  );
}
