"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

interface DraftHandlers {
  onSave: () => void;
  onDiscard: () => void;
}

const NOOP_HANDLERS: DraftHandlers = { onSave: () => {}, onDiscard: () => {} };

interface NavigationBlockerContextValue {
  isDirty: boolean;
  /** Un formulaire s'enregistre ici pendant qu'il a des données non
   * sauvegardées, avec ce qu'il faut faire si l'utilisateur choisit de
   * sauvegarder ou d'abandonner en quittant. */
  guard: (isDirty: boolean, handlers: DraftHandlers) => void;
  /** Appelé par un lien de nav intercepté (`onNavigate`) quand `isDirty`. */
  blockNavigation: (href: string) => void;
}

const NavigationBlockerContext =
  createContext<NavigationBlockerContextValue | null>(null);

export function NavigationBlockerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const handlersRef = useRef<DraftHandlers>(NOOP_HANDLERS);

  const guard = useCallback((dirty: boolean, handlers: DraftHandlers) => {
    setIsDirty(dirty);
    handlersRef.current = handlers;
  }, []);

  const blockNavigation = useCallback((href: string) => {
    setPendingHref(href);
  }, []);

  // Filet de sécurité pour une fermeture d'onglet/actualisation : le
  // navigateur n'autorise qu'un message générique, pas notre dialogue.
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function resolve(action: "save" | "discard") {
    if (action === "save") {
      handlersRef.current.onSave();
    } else {
      handlersRef.current.onDiscard();
    }
    const href = pendingHref;
    setIsDirty(false);
    setPendingHref(null);
    if (href) router.push(href);
  }

  return (
    <NavigationBlockerContext.Provider
      value={{ isDirty, guard, blockNavigation }}
    >
      {children}

      <Dialog
        open={pendingHref !== null}
        onOpenChange={(open) => {
          if (!open) setPendingHref(null);
        }}
      >
        <DialogPortal className="max-w-sm">
          <DialogTitle>Données non enregistrées</DialogTitle>
          <DialogDescription>
            Vous avez commencé à remplir ce formulaire. Voulez-vous
            sauvegarder ces informations dans votre navigateur pour continuer
            plus tard, ou les abandonner ?
          </DialogDescription>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingHref(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => resolve("discard")}
            >
              Abandonner
            </Button>
            <Button type="button" onClick={() => resolve("save")}>
              Sauvegarder
            </Button>
          </div>
        </DialogPortal>
      </Dialog>
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker(): NavigationBlockerContextValue {
  const context = useContext(NavigationBlockerContext);
  if (!context) {
    throw new Error(
      "useNavigationBlocker doit être utilisé à l'intérieur d'un NavigationBlockerProvider."
    );
  }
  return context;
}
