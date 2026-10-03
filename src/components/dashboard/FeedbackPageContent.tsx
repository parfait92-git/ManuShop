"use client";

import { MessageSquareText, PackageCheck, Truck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { SellerReply } from "@/components/storefront/SellerReply";
import { StarRatingDisplay } from "@/components/storefront/StarRatingInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { OrderItem } from "@/models/order/OrderItem";
import type { ReviewReply } from "@/models/review/OrderFeedback";
import {
  countUnreplied,
  feedbackService,
  type ShopOrderFeedback,
} from "@/services/FeedbackService";
import { orderService } from "@/services/OrderService";

function formatDate(value: { toDate?: () => Date } | undefined): string {
  const date = value?.toDate?.();
  return date
    ? date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : "";
}

/** Une réponse, ou le formulaire pour en écrire (ou en modifier) une. */
function ReplyArea({
  fieldId,
  reply,
  isPublic,
  onReply,
}: {
  fieldId: string;
  reply?: ReviewReply;
  isPublic: boolean;
  onReply: (text: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reply?.text ?? "");
  const [sending, setSending] = useState(false);

  if (reply && !editing) {
    return (
      <div className="flex flex-col items-start gap-1">
        <SellerReply reply={reply} />
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Modifier la réponse
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await onReply(text.trim());
      setEditing(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label
        htmlFor={fieldId}
        help={
          isPublic
            ? "Votre réponse est publiée sous l'avis, sur la fiche de l'article, et le client est notifié. Restez courtois : elle est visible de tous."
            : "Votre réponse est privée : seul le client la lit. Il est notifié dès l'envoi."
        }
      >
        {isPublic ? "Votre réponse (publique)" : "Votre réponse (privée)"}
      </Label>
      <textarea
        id={fieldId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Merci pour votre retour..."
        className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      />
      <div className="flex flex-wrap justify-end gap-2">
        {reply && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
            Annuler
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!text.trim() || sending}>
          {sending ? "Envoi..." : "Répondre"}
        </Button>
      </div>
    </form>
  );
}

function FeedbackEntry({
  icon: Icon,
  title,
  badge,
  rating,
  comment,
  date,
  defective,
  children,
}: {
  icon: typeof Truck;
  title: string;
  badge: string;
  rating?: number;
  comment: string;
  date: string;
  defective?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 font-medium break-words">{title}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {badge}
        </span>
        {defective && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            Défectueux
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {typeof rating === "number" && <StarRatingDisplay value={rating} />}
        <span>{date}</span>
      </div>
      <p className="text-sm break-words whitespace-pre-line">{comment}</p>
      {children}
    </div>
  );
}

async function fetchFeedback(shopId: string) {
  const [groups, orders] = await Promise.all([
    feedbackService.listForShop(shopId),
    orderService.listByShop(shopId),
  ]);
  // Noms des articles tels qu'au moment de la commande (l'avis ne garde que
  // l'id du produit).
  const names = new Map<string, string>();
  for (const order of orders) {
    order.items.forEach((item: OrderItem) => names.set(`${order.id}/${item.productId}`, item.name));
  }
  return { groups, names };
}

/**
 * « Avis clients » (2026-10-02) : les avis laissés sur les commandes livrées
 * de la boutique, regroupés par commande — la livraison (privé) et chaque
 * article (publié sur sa fiche). Le commerçant peut répondre à chacun ; le
 * client en est notifié.
 */
export function FeedbackPageContent({ shopId }: { shopId: string }) {
  const [groups, setGroups] = useState<ShopOrderFeedback[] | null>(null);
  const [itemNames, setItemNames] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState<"unreplied" | "all">("unreplied");
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const { groups: data, names } = await fetchFeedback(shopId);
    setItemNames(names);
    setGroups(data);
  }, [shopId]);

  useEffect(() => {
    let active = true;
    fetchFeedback(shopId)
      .then(({ groups: data, names }) => {
        if (!active) return;
        setItemNames(names);
        setGroups(data);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [shopId]);

  async function reply(target: "delivery" | "review", id: string, text: string) {
    try {
      await feedbackService.reply({ target, id, text });
      toast.success("Réponse envoyée. Le client est notifié.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi. Réessayez.");
      throw err;
    }
  }

  if (error) {
    return <p className="text-sm text-destructive">Impossible de charger les avis. Réessayez.</p>;
  }
  if (!groups) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  const unrepliedTotal = groups.reduce((sum, group) => sum + countUnreplied(group), 0);
  const shown = filter === "all" ? groups : groups.filter((group) => countUnreplied(group) > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Avis clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ce que vos clients pensent de leurs livraisons et de vos articles. Répondez-leur : ils
          sont notifiés.
        </p>
      </div>

      <div data-tour="feedback-filter" className="flex flex-col gap-1.5 sm:max-w-64">
        <Label
          htmlFor="feedback-filter"
          help="« Sans réponse » montre les commandes dont au moins un avis attend votre réponse."
        >
          Afficher
        </Label>
        <Select
          id="feedback-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value as "unreplied" | "all")}
        >
          <option value="unreplied">Sans réponse ({unrepliedTotal})</option>
          <option value="all">Tous les avis</option>
        </Select>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border py-16 text-center">
          <MessageSquareText className="size-8 text-muted-foreground" aria-hidden />
          <p className="px-4 text-sm text-muted-foreground">
            {groups.length === 0
              ? "Aucun avis pour l'instant. Vos clients sont invités à en donner dès qu'une commande est marquée « Livrée »."
              : "Vous avez répondu à tous les avis."}
          </p>
        </div>
      ) : (
        <ul data-tour="feedback-list" className="flex flex-col gap-4">
          {shown.map((group) => (
            <li
              key={group.orderId}
              className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold break-words">{group.clientName || "Client"}</p>
                <p className="text-xs text-muted-foreground">
                  Commande n° {group.orderId.slice(0, 8)}
                </p>
              </div>

              {group.delivery && (
                <FeedbackEntry
                  icon={Truck}
                  title="Livraison"
                  badge="Privé"
                  rating={group.delivery.rating}
                  comment={group.delivery.comment}
                  date={formatDate(group.delivery.createdAt)}
                >
                  <ReplyArea
                    fieldId={`reply-delivery-${group.orderId}`}
                    reply={group.delivery.reply}
                    isPublic={false}
                    onReply={(text) => reply("delivery", group.orderId, text)}
                  />
                </FeedbackEntry>
              )}

              {group.reviews.map((review) => (
                <FeedbackEntry
                  key={review.id}
                  icon={PackageCheck}
                  title={itemNames.get(`${review.orderId}/${review.productId}`) ?? "Article"}
                  badge="Public"
                  rating={review.rating}
                  comment={review.comment}
                  date={formatDate(review.createdAt)}
                  defective={review.reason === "defective"}
                >
                  <ReplyArea
                    fieldId={`reply-review-${review.id}`}
                    reply={review.reply}
                    isPublic
                    onReply={(text) => reply("review", review.id, text)}
                  />
                </FeedbackEntry>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
