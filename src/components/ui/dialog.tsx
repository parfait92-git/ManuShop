"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";

import { useTour } from "@/components/onboarding/TourProvider";

/**
 * `Dialog.Root` de Base UI, adapté aux visites guidées (BF-134/135) : la
 * bulle de visite est rendue hors de la fenêtre (portail `react-joyride`).
 * Une fenêtre modale bloquerait alors les clics dessus, et un clic sur
 * "Suivant" compterait comme un clic extérieur qui la ferme. Pendant une
 * visite, la fenêtre passe donc en non modale et ignore toute demande de
 * fermeture (clic extérieur, Échap qui sert aussi à quitter la visite).
 */
function Dialog({
  modal,
  disablePointerDismissal,
  onOpenChange,
  ...props
}: DialogPrimitive.Root.Props) {
  const { isRunning } = useTour();
  return (
    <DialogPrimitive.Root
      {...props}
      modal={isRunning ? false : modal}
      disablePointerDismissal={isRunning || disablePointerDismissal}
      onOpenChange={(open, eventDetails) => {
        if (!open && isRunning) return;
        onOpenChange?.(open, eventDetails);
      }}
    />
  );
}
const DialogClose = DialogPrimitive.Close;

function DialogPortal({
  className,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        data-slot="dialog-popup"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border border-border bg-background p-6 text-foreground shadow-lg transition-[scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
          className
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Dialog, DialogClose, DialogPortal, DialogTitle, DialogDescription };
