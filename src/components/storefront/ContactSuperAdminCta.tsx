"use client";

import { Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supportMessageService } from "@/services/SupportMessageService";
import styles from "@/styles/GlassButton.module.scss";

/**
 * Bouton "Nous contacter" de la landing page — remplace un simple lien
 * `mailto:` (ouvrait le client mail local, peu fiable/pas suivi) par un
 * vrai message dans la boîte de réception du Super Admin
 * (`/super-admin/messages`, même collection que le formulaire premium du
 * tableau de bord commerçant, BF-112, voir `sendContactMessageAction` —
 * n'importe quel compte connecté, pas seulement un commerçant). Un visiteur
 * non connecté peut quand même rédiger son message ; se connecter n'est
 * exigé qu'à l'envoi, pour ne pas décourager avant même d'avoir vu le
 * formulaire.
 */
export function ContactSuperAdminCta() {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function reset() {
    setSubject("");
    setBody("");
    setError(null);
    setSent(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firebaseUser) {
      setError(
        "Vous devez être connecté(e) pour envoyer ce message. Connectez-vous, puis renvoyez-le.",
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await supportMessageService.sendContactMessage(subject, body);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'envoi. Réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${styles.button} ${styles["button--ghost"]}`}
      >
        <Phone className="size-4" />
        Nous contacter
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          setOpen(next);
        }}
      >
        <DialogPortal className="max-w-md">
          <DialogTitle>Nous contacter</DialogTitle>
          <DialogDescription>
            Envoyez un message à l&apos;équipe ManuShop.
          </DialogDescription>

          {sent ? (
            <p className="text-sm text-muted-foreground">
              Message envoyé. Nous reviendrons vers vous rapidement.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-subject">Objet</Label>
                <Input
                  id="contact-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-body">Message</Label>
                <textarea
                  id="contact-body"
                  rows={4}
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">
                  {error}{" "}
                  {!firebaseUser && (
                    <Link href="/login" className="underline">
                      Se connecter
                    </Link>
                  )}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !subject.trim() || !body.trim()}
                >
                  {submitting ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </form>
          )}
        </DialogPortal>
      </Dialog>
    </>
  );
}
