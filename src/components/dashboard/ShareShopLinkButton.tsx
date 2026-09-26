"use client";

import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "cn";

function buildShopUrl(shopId: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/boutique/${shopId}`;
}

/**
 * BF-91 : partager le lien public d'une boutique sans avoir à ouvrir sa
 * vitrine et copier l'URL depuis la barre d'adresse. `navigator.share`
 * n'existe pas côté serveur — détecté dans un effet (jamais au premier
 * rendu) pour éviter un mismatch d'hydratation, même piège déjà rencontré
 * sur `ScrollReveal`/`usePwaInstall`.
 */
export function ShareShopLinkButton({
  shopId,
  shopName,
  className,
}: {
  shopId: string;
  shopName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const url = buildShopUrl(shopId);

  useEffect(() => {
    queueMicrotask(() =>
      setCanNativeShare(
        typeof navigator !== "undefined" && typeof navigator.share === "function"
      )
    );
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien.");
    }
    setOpen(false);
  }

  async function handleNativeShare() {
    setOpen(false);
    try {
      await navigator.share({ title: shopName, url });
    } catch {
      // Annulé par l'utilisateur ou API indisponible — pas une erreur à signaler.
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shopName} — ${url}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(shopName)}&body=${encodeURIComponent(url)}`;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={cn("w-fit gap-1.5", className)}
        onClick={() => setOpen((value) => !value)}
      >
        {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
        Partager le lien
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-background py-1 shadow-lg">
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <Copy className="size-4" />
              Copier le lien
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
            <a
              href={mailHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <Mail className="size-4" />
              Email
            </a>
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              >
                <Share2 className="size-4" />
                Plus d&apos;options...
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
