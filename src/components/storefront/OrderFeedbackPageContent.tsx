"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SellerReply } from "@/components/storefront/SellerReply";
import { StarRatingDisplay, StarRatingInput } from "@/components/storefront/StarRatingInput";
import { Button } from "@/components/ui/button";
import { CoachMark } from "@/components/ui/CoachMark";
import { Label } from "@/components/ui/label";
import type { Order } from "@/models/order/Order";
import type { OrderFeedback } from "@/models/review/OrderFeedback";
import type { Review } from "@/models/review/Review";
import { feedbackService } from "@/services/FeedbackService";
import { orderService } from "@/services/OrderService";
import { reviewService } from "@/services/ReviewService";

/** Une étape : la livraison, puis chaque article de la commande. */
type Step = { kind: "delivery" } | { kind: "item"; productId: string; name: string };

/** Un même article peut figurer deux fois dans une commande : un seul avis. */
function buildSteps(order: Order): Step[] {
  const seen = new Set<string>();
  const items = order.items.filter((item) => {
    if (seen.has(item.productId)) return false;
    seen.add(item.productId);
    return true;
  });
  return [
    { kind: "delivery" },
    ...items.map((item) => ({ kind: "item" as const, productId: item.productId, name: item.name })),
  ];
}

/** Avis déjà donné à une étape (lecture seule), ou `undefined`. */
type Given = Pick<Review, "rating" | "comment" | "reply" | "reason"> | OrderFeedback;

function StepForm({
  step,
  onSubmit,
  onSkip,
}: {
  step: Step;
  onSubmit: (value: { rating?: number; comment: string; defective: boolean }) => Promise<void>;
  onSkip: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [defective, setDefective] = useState(false);
  const [sending, setSending] = useState(false);
  const isDelivery = step.kind === "delivery";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      await onSubmit({ rating: rating > 0 ? rating : undefined, comment: comment.trim(), defective });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          Note (facultative)
          <CoachMark label="Aide : note">
            De 1 à 5 étoiles, selon votre satisfaction. Facultatif : votre commentaire suffit si vous ne souhaitez pas noter.
          </CoachMark>
        </div>
        <div data-tour="feedback-rating" className="w-fit">
          <StarRatingInput
            value={rating}
            onChange={setRating}
            label={isDelivery ? "Note de la livraison" : "Note de l'article"}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="feedback-comment"
          help={
            isDelivery
              ? "Délai, état du colis, amabilité du livreur… Obligatoire. Seule la boutique lira ce commentaire : il n'est pas publié."
              : "Qualité, conformité à la description, taille… Obligatoire. Votre avis sera publié sur la fiche de l'article."
          }
        >
          {isDelivery ? "Comment s'est passée la livraison ?" : "Que pensez-vous de cet article ?"}
        </Label>
        <textarea
          id="feedback-comment"
          data-tour="feedback-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Votre commentaire..."
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
        />
      </div>

      {!isDelivery && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={defective}
              onChange={(event) => setDefective(event.target.checked)}
              className="size-4"
            />
            Signaler un article défectueux
          </label>
          <CoachMark label="Aide : article défectueux">
            Cochez si l&apos;article est arrivé abîmé ou ne fonctionne pas. Votre avis est alors marqué comme signalant un défaut, pour alerter la boutique.
          </CoachMark>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onSkip} disabled={sending}>
          Passer
        </Button>
        <Button data-tour="feedback-submit" type="submit" disabled={!comment.trim() || sending}>
          {sending ? "Envoi..." : "Envoyer"}
        </Button>
      </div>
    </form>
  );
}

function GivenFeedback({ given }: { given: Given }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4" aria-hidden />
        Avis envoyé
      </p>
      {typeof given.rating === "number" && <StarRatingDisplay value={given.rating} />}
      <p className="text-sm break-words whitespace-pre-line">{given.comment}</p>
      {"reason" in given && given.reason === "defective" && (
        <p className="text-xs text-destructive">Article signalé comme défectueux.</p>
      )}
      {given.reply ? (
        <SellerReply reply={given.reply} />
      ) : (
        <p className="text-xs text-muted-foreground">La boutique n&apos;a pas encore répondu.</p>
      )}
    </div>
  );
}

/**
 * Écran d'avis d'une commande livrée (2026-10-02), ouvert depuis la
 * notification « commande livrée » ou depuis « Mes commandes ». Étape par
 * étape : la livraison (avis privé, lu par la boutique seule), puis chaque
 * article (avis publié sur sa fiche). Chaque étape est enregistrée dès
 * l'envoi ; une étape déjà faite s'affiche en lecture seule, avec la
 * réponse de la boutique.
 */
export function OrderFeedbackPageContent({
  orderId,
  clientId,
}: {
  orderId: string;
  clientId: string;
}) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [delivery, setDelivery] = useState<OrderFeedback | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([orderService.getOrder(orderId), feedbackService.getForOrder(orderId, clientId)])
      .then(([loaded, bundle]) => {
        if (!active) return;
        setOrder(loaded && loaded.clientId === clientId ? loaded : null);
        setDelivery(bundle.delivery);
        setReviews(bundle.reviews);
        if (loaded) {
          // Reprend à la première étape pas encore faite.
          const steps = buildSteps(loaded);
          const firstOpen = steps.findIndex((step) =>
            step.kind === "delivery"
              ? !bundle.delivery
              : !bundle.reviews.some((review) => review.productId === step.productId)
          );
          setIndex(firstOpen === -1 ? 0 : firstOpen);
          setFinished(firstOpen === -1);
        }
      })
      .catch(() => active && setOrder(null));
    return () => {
      active = false;
    };
  }, [orderId, clientId]);

  if (order === undefined) {
    return <p className="px-6 py-10 text-sm text-muted-foreground">Chargement...</p>;
  }

  if (order === null || order.status !== "delivered") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-3 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Donner mon avis</h1>
        <p className="text-sm text-muted-foreground">
          {order === null
            ? "Commande introuvable."
            : "Vous pourrez donner votre avis dès que cette commande sera livrée."}
        </p>
        <Link href="/mes-commandes" className="text-sm font-medium text-primary hover:underline">
          Retour à mes commandes
        </Link>
      </div>
    );
  }

  const steps = buildSteps(order);
  const step = steps[index];
  const givenFor = (s: Step): Given | undefined =>
    s.kind === "delivery"
      ? (delivery ?? undefined)
      : reviews.find((review) => review.productId === s.productId);
  const doneCount = steps.filter((s) => givenFor(s)).length;

  function goNext() {
    if (index < steps.length - 1) setIndex(index + 1);
    else setFinished(true);
  }

  async function handleSubmit(value: { rating?: number; comment: string; defective: boolean }) {
    try {
      if (step.kind === "delivery") {
        await feedbackService.submitDeliveryFeedback({
          orderId,
          rating: value.rating,
          comment: value.comment,
        });
        setDelivery({
          orderId,
          shopId: order!.shopId,
          clientId,
          clientName: order!.clientName,
          rating: value.rating,
          comment: value.comment,
          createdAt: undefined as never,
        });
      } else {
        const { reviewId } = await reviewService.submitReview({
          orderId,
          productId: step.productId,
          rating: value.rating,
          comment: value.comment,
          reason: value.defective ? "defective" : undefined,
        });
        setReviews((current) => [
          ...current,
          {
            id: reviewId,
            productId: step.productId,
            shopId: order!.shopId,
            orderId,
            authorId: clientId,
            rating: value.rating,
            comment: value.comment,
            reason: value.defective ? "defective" : undefined,
            createdAt: undefined as never,
          },
        ]);
      }
      toast.success("Merci pour votre avis !");
      goNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'envoi. Réessayez.");
    }
  }

  const given = givenFor(step);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <Link
          href="/mes-commandes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Mes commandes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Donner mon avis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Commande du{" "}
          {order.createdAt.toDate().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · {doneCount} avis sur {steps.length}
        </p>
      </div>

      {/* Les étapes : un clic y revient (pour relire un avis ou la réponse
      de la boutique). */}
      <ol data-tour="feedback-steps" className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <li key={s.kind === "delivery" ? "delivery" : s.productId}>
            <button
              type="button"
              onClick={() => {
                setIndex(i);
                setFinished(false);
              }}
              aria-current={!finished && i === index ? "step" : undefined}
              className={`flex max-w-48 items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                !finished && i === index
                  ? "border-primary bg-primary/10 font-medium text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {givenFor(s) ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-label="fait" />
              ) : (
                <span className="shrink-0">{i + 1}.</span>
              )}
              <span className="truncate">{s.kind === "delivery" ? "Livraison" : s.name}</span>
            </button>
          </li>
        ))}
      </ol>

      {finished ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border p-6 text-center">
          <CheckCircle2 className="size-8 text-emerald-600" aria-hidden />
          <p className="font-medium">
            {doneCount === steps.length
              ? "Merci, vous avez donné votre avis sur toute la commande !"
              : `Merci ! ${doneCount} avis envoyé(s) sur ${steps.length}.`}
          </p>
          <p className="text-sm text-muted-foreground">
            Vous serez notifié si la boutique vous répond. Touchez une étape pour la revoir
            {doneCount < steps.length ? " ou la compléter" : ""}.
          </p>
          <Link href="/mes-commandes" className="text-sm font-medium text-primary hover:underline">
            Retour à mes commandes
          </Link>
        </div>
      ) : (
        <section
          data-tour="feedback-step"
          aria-labelledby="feedback-step-title"
          className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {step.kind === "delivery" ? (
                <Truck className="size-4" aria-hidden />
              ) : (
                <PackageCheck className="size-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Étape {index + 1} sur {steps.length}
              </p>
              <h2 id="feedback-step-title" className="font-semibold break-words">
                {step.kind === "delivery" ? "La livraison" : step.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {step.kind === "delivery"
                  ? "Avis privé : seule la boutique le lira."
                  : "Avis public : il apparaîtra sur la fiche de l'article."}
              </p>
            </div>
          </div>

          {given ? (
            <GivenFeedback given={given} />
          ) : (
            <StepForm
              key={step.kind === "delivery" ? "delivery" : step.productId}
              step={step}
              onSubmit={handleSubmit}
              onSkip={goNext}
            />
          )}

          <div className="flex justify-between gap-3 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Précédent
            </Button>
            {given && (
              <Button type="button" variant="ghost" size="sm" onClick={goNext}>
                {index < steps.length - 1 ? "Suivant" : "Terminer"}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
