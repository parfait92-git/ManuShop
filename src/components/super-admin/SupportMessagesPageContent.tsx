"use client";

import { ChevronDown, ChevronRight, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { SupportMessage } from "@/models/support/SupportMessage";
import { supportMessageService } from "@/services/SupportMessageService";

function formatDate(value: SupportMessage["createdAt"]) {
  return value.toDate().toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReplyForm({
  message,
  onReplied,
}: {
  message: SupportMessage;
  onReplied: (id: string, reply: SupportMessage["reply"]) => void;
}) {
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await supportMessageService.replyToMessage(message.id, reply);
      onReplied(message.id, { body: reply.trim(), createdAt: message.createdAt });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'envoi. Réessayez."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form data-tour="messages-reply" onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        rows={3}
        placeholder="Votre réponse..."
        className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30"
        value={reply}
        onChange={(event) => setReply(event.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        size="sm"
        disabled={submitting || !reply.trim()}
        className="self-start"
      >
        {submitting ? "Envoi..." : "Répondre"}
      </Button>
    </form>
  );
}

function MessageRow({
  message,
  onReplied,
}: {
  message: SupportMessage;
  onReplied: (id: string, reply: SupportMessage["reply"]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/40 sm:px-6"
      >
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{message.subject}</span>
          <span className="truncate text-sm text-muted-foreground">
            {message.shopName
              ? `${message.shopName} — ${message.senderName}`
              : `Site web — ${message.senderName}`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`text-xs font-medium ${
              message.status === "answered"
                ? "text-emerald-600"
                : "text-muted-foreground"
            }`}
          >
            {message.status === "answered" ? "Répondu" : "En attente"}
          </span>
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border bg-muted/10 px-4 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground">
            {formatDate(message.createdAt)}
          </p>
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
          {message.reply ? (
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-semibold">
                Votre réponse — {formatDate(message.reply.createdAt)}
              </p>
              <p className="text-sm whitespace-pre-wrap">{message.reply.body}</p>
            </div>
          ) : (
            <ReplyForm message={message} onReplied={onReplied} />
          )}
        </div>
      )}
    </li>
  );
}

// Pas d'`onSnapshot` possible ici, contrairement à `SupportPageContent`
// (côté commerçant) : `firestore.rules` n'accorde de lecture de
// `supportMessages` qu'au commerçant propriétaire de la boutique concernée,
// jamais au Super Admin (voir `listSupportMessagesAction`, même limite que
// `useNewSupportMessagesCount`). Un sondage court (pas les 60s du badge de
// la sidebar, une notification d'ambiance) redonne un ressenti proche du
// temps réel sur cette page où l'utilisateur regarde activement la liste.
const POLL_INTERVAL_MS = 15_000;

/** BF-113/114 : consultation et réponse aux messages envoyés par les
 * commerçants (`SupportPageContent`, côté `/dashboard/support`). */
export function SupportMessagesPageContent() {
  const [messages, setMessages] = useState<SupportMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    function refresh() {
      supportMessageService
        .listAllMessages()
        .then((data) => {
          if (active) setMessages(data);
        })
        .catch((err) => {
          console.error(
            "SupportMessagesPageContent : échec du chargement des messages",
            err
          );
          if (active) {
            setMessages((current) => current ?? []);
            setError("Échec du chargement des messages. Réessayez.");
          }
        });
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  function handleReplied(id: string, reply: SupportMessage["reply"]) {
    setMessages(
      (current) =>
        current?.map((message) =>
          message.id === id ? { ...message, status: "answered", reply } : message
        ) ?? current
    );
    toast.success("Réponse envoyée.");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Messages envoyés par les commerçants depuis leur tableau de bord.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {messages === null ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Mail className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Aucun message pour le moment.
          </p>
        </div>
      ) : (
        <ul data-tour="messages-list" className="divide-y divide-border rounded-xl border border-border bg-background">
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} onReplied={handleReplied} />
          ))}
        </ul>
      )}
    </div>
  );
}
