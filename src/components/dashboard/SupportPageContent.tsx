"use client";

import { Lock, Mail } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentShop } from "@/hooks/useCurrentShop";
import { usePremiumAccess } from "@/hooks/usePremiumCatalog";
import { useSupportMessagesForShop } from "@/hooks/useSupportMessagesForShop";
import type { SupportMessage } from "@/models/support/SupportMessage";
import { supportMessageService } from "@/services/SupportMessageService";
import { formatDateTime } from "@/lib/dateTime";

function formatDate(message: SupportMessage["createdAt"]) {
  return formatDateTime(message.toDate());
}

function MessageCard({ message }: { message: SupportMessage }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{message.subject}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(message.createdAt)}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-medium ${
            message.status === "answered"
              ? "text-emerald-600"
              : "text-muted-foreground"
          }`}
        >
          {message.status === "answered" ? "Répondu" : "En attente"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
        {message.body}
      </p>
      {message.reply && (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold text-foreground">
            Réponse du Super Admin — {formatDate(message.reply.createdAt)}
          </p>
          <p className="text-sm whitespace-pre-wrap">{message.reply.body}</p>
        </div>
      )}
    </li>
  );
}

/**
 * BF-112→115 : formulaire "Nous contacter" — réservé aux boutiques ayant le
 * privilège premium `contactForm` (voir `lib/premiumFeatures.ts`), activé
 * par un Super Admin depuis `/super-admin/commercants`. Revérifié côté
 * serveur à l'envoi (`sendSupportMessageAction`), pas seulement masqué ici.
 */
export function SupportPageContent() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAccess = usePremiumAccess(shop);
  const enabled = hasAccess("contactForm");
  const messages = useSupportMessagesForShop(enabled ? shop?.id : undefined);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!shop) return;
    setError(null);
    setSubmitting(true);
    try {
      await supportMessageService.sendMessage(subject, body);
      setSubject("");
      setBody("");
      // Pas de re-fetch manuel : `useSupportMessagesForShop` reçoit déjà ce
      // nouveau message via son écouteur temps réel.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'envoi. Réessayez."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Contacter le Super Admin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envoyez un message au Super Admin de la plateforme et consultez ses
          réponses.
        </p>
      </div>

      {shopLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : !enabled ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Cette fonctionnalité est réservée aux boutiques disposant du
            privilège premium correspondant.
          </p>
        </div>
      ) : (
        <>
          <form
            data-tour="support-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="size-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Nouveau message</h2>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support-subject" help="Le sujet de votre demande en quelques mots, ex. « Problème d'ajout de photo ».">Objet</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support-body" help="Décrivez votre question ou votre problème : ce que vous faisiez, ce qui s'est passé. Plus c'est précis, plus la réponse sera rapide.">Message</Label>
              <textarea
                id="support-body"
                rows={4}
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={submitting || !subject.trim() || !body.trim()}
              className="self-start"
            >
              {submitting ? "Envoi..." : "Envoyer"}
            </Button>
          </form>

          {messages === undefined ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun message envoyé pour le moment.
            </p>
          ) : (
            <ul data-tour="support-history" className="flex flex-col gap-3">
              {messages.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
