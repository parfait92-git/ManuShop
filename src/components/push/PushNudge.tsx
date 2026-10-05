"use client";

import { BellRing, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { pushAvailability } from "@/lib/push";
import { pushService } from "@/services/PushService";

const DISMISS_KEY = "manushop:push-nudge-dismissed";

/**
 * Invitation discrète, sur le tableau de bord, à activer les notifications
 * de nouvelles commandes sur cet appareil (2026-10-04). N'apparaît que si
 * c'est possible ici, pas encore fait, pas refusé, et pas écarté.
 */
export function PushNudge() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    pushAvailability().then((availability) => {
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      } catch {}
      if (
        active &&
        availability === "available" &&
        !dismissed &&
        !pushService.isEnabledHere() &&
        Notification.permission !== "denied"
      ) {
        setVisible(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setVisible(false);
  }

  async function enable() {
    setBusy(true);
    try {
      if (await pushService.enable()) {
        toast.success("Notifications activées : vous serez prévenu de chaque nouvelle commande.");
        setVisible(false);
      } else {
        dismiss();
      }
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Les notifications n'ont pas pu être activées.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;
  return (
    <div
      role="region"
      aria-label="Activer les notifications"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-shell-border bg-shell-surface px-4 py-3 text-sm text-shell-text"
    >
      <BellRing className="size-5 shrink-0 text-shell-accent" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-medium">Ne manquez plus une commande.</span>{" "}
        <span className="text-shell-subtle">Recevez une notification sur cet appareil, même quand ManuShop est fermée.</span>
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={enable} disabled={busy}>
          Activer
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Plus tard" onClick={dismiss}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
