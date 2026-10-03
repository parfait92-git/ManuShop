import type { ReviewReply } from "@/models/review/OrderFeedback";
import { formatDateTime } from "@/lib/dateTime";

/** « Réponse du vendeur » sous un avis (fiche produit, écran d'avis du
 * client, écran « Avis clients » du commerçant). */
export function SellerReply({ reply }: { reply: ReviewReply }) {
  const date = reply.repliedAt?.toDate?.();
  return (
    <div className="mt-2 rounded-lg border-l-2 border-primary bg-muted/50 px-3 py-2">
      <p className="text-xs font-semibold text-foreground">
        Réponse du vendeur
        {date && (
          <span className="font-normal text-muted-foreground">
            {" "}
            · {formatDateTime(date)}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-sm break-words whitespace-pre-line">{reply.text}</p>
    </div>
  );
}
