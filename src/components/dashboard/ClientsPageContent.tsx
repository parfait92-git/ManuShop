"use client";

import { Download, MessageCircle, Phone, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "cn";

import { DialogTour } from "@/components/onboarding/DialogTour";
import { Button, buttonVariants } from "@/components/ui/button";
import { CoachMark } from "@/components/ui/CoachMark";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  STICKY_COLUMN_CONTENT,
  ScrollableTable,
} from "@/components/ui/scrollable-table";
import { Select } from "@/components/ui/select";
import {
  CLIENT_SEGMENT_LABEL,
  INACTIVE_CLIENT_DAYS,
  LOYAL_CLIENT_ORDERS,
  NEW_CLIENT_DAYS,
  buildClientDirectory,
  clientWhatsAppLink,
  clientsToCsv,
  matchesClient,
  sortClients,
  type ClientSegment,
  type ClientSort,
  type ClientSummary,
} from "@/lib/clientDirectory";
import { ORDER_STATUS_BADGE_CLASS, ORDER_STATUS_LABEL } from "@/lib/orderStatus";
import type { Order } from "@/models/order/Order";
import { orderService } from "@/services/OrderService";
import { formatDateTime } from "@/lib/dateTime";

const SEGMENT_CLASS: Record<ClientSegment, string> = {
  new: "bg-shell-accent-soft text-shell-accent",
  loyal: "bg-emerald-50 text-emerald-700",
  inactive: "bg-shell-hover text-shell-muted",
};

const SEGMENT_HELP: Record<ClientSegment, string> = {
  new: `Premier achat il y a moins de ${NEW_CLIENT_DAYS} jours. Un bon moment pour les remercier et les faire revenir.`,
  loyal: `Au moins ${LOYAL_CLIENT_ORDERS} commandes livrées. Vos meilleurs clients : pensez à les chouchouter.`,
  inactive: `Aucune commande depuis ${INACTIVE_CLIENT_DAYS} jours ou plus. Un message ou une promotion peut les faire revenir.`,
};

type SegmentFilter = "all" | ClientSegment;

const DATE = { format: (date: Date) => formatDateTime(date) };

function money(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function SegmentBadges({ segments }: { segments: ClientSegment[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {segments.map((segment) => (
        <span
          key={segment}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            SEGMENT_CLASS[segment]
          )}
        >
          {CLIENT_SEGMENT_LABEL[segment]}
        </span>
      ))}
    </span>
  );
}

function ContactButtons({ client }: { client: ClientSummary }) {
  const whatsapp = clientWhatsAppLink(client.phone);
  if (!client.phone) {
    return <p className="text-sm text-shell-subtle">Aucun numéro enregistré.</p>;
  }
  return (
    <div data-tour="client-contact" className="flex flex-wrap gap-2">
      <a
        href={`tel:${client.phone.replace(/\s/g, "")}`}
        className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
      >
        <Phone aria-hidden className="size-4" />
        Appeler
      </a>
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
        >
          <MessageCircle aria-hidden className="size-4" />
          WhatsApp
        </a>
      )}
    </div>
  );
}

function OrderHistory({ orders }: { orders: Order[] }) {
  return (
    <ul data-tour="client-orders" className="flex flex-col divide-y divide-shell-border rounded-lg border border-shell-border">
      {orders.map((order) => (
        <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-shell-text">
              {order.total.toLocaleString("fr-FR")} FCFA
            </p>
            <p className="text-xs text-shell-subtle">
              {DATE.format(order.createdAt.toDate())} ·{" "}
              {order.items.reduce((n, item) => n + item.quantity, 0)} article
              {order.items.reduce((n, item) => n + item.quantity, 0) > 1 ? "s" : ""}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
              ORDER_STATUS_BADGE_CLASS[order.status]
            )}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ClientDialog({
  client,
  onClose,
}: {
  client: ClientSummary | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={client !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal className="max-h-[90svh] max-w-md overflow-y-auto">
        {client && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="break-words">{client.name}</DialogTitle>
                <DialogDescription>
                  Client depuis le {DATE.format(client.firstOrderAt)}
                  {client.hasAccount ? " · a un compte client" : " · sans compte client"}
                </DialogDescription>
              </div>
              <DialogTour tourId="dialog-client" />
            </div>

            <SegmentBadges segments={client.segments} />

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-shell-subtle">Total dépensé</dt>
                <dd className="font-semibold text-shell-text">{money(client.totalSpent)}</dd>
              </div>
              <div>
                <dt className="text-shell-subtle">Commandes</dt>
                <dd className="font-semibold text-shell-text">
                  {client.ordersCount}{" "}
                  <span className="font-normal text-shell-subtle">
                    ({client.deliveredCount} livrée{client.deliveredCount > 1 ? "s" : ""})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-shell-subtle">Téléphone</dt>
                <dd className="break-words text-shell-text">{client.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-shell-subtle">Adresse</dt>
                <dd className="break-words text-shell-text">{client.address || "—"}</dd>
              </div>
            </dl>

            <ContactButtons client={client} />

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-shell-text">Historique des commandes</h3>
              <OrderHistory orders={client.orders} />
            </div>

            <Button type="button" variant="outline" onClick={onClose} className="w-full">
              Fermer
            </Button>
          </>
        )}
      </DialogPortal>
    </Dialog>
  );
}

/**
 * Fichier clients de la boutique (`/dashboard/clients`), reconstitué à
 * partir de ses commandes — voir `src/lib/clientDirectory.ts`.
 */
export function ClientsPageContent({ shopId }: { shopId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [term, setTerm] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [sort, setSort] = useState<ClientSort>("recent");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    orderService
      .listByShop(shopId)
      .then((list) => active && setOrders(list))
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, [shopId]);

  const clients = useMemo(() => (orders ? buildClientDirectory(orders) : []), [orders]);

  const counts = useMemo(() => {
    const result: Record<SegmentFilter, number> = { all: clients.length, new: 0, loyal: 0, inactive: 0 };
    for (const client of clients) for (const s of client.segments) result[s] += 1;
    return result;
  }, [clients]);

  const visible = useMemo(
    () =>
      sortClients(
        clients.filter(
          (c) => (segment === "all" || c.segments.includes(segment)) && matchesClient(c, term)
        ),
        sort
      ),
    [clients, segment, term, sort]
  );

  const selected = clients.find((c) => c.key === selectedKey) ?? null;

  function handleExport() {
    const blob = new Blob([clientsToCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive">
        Impossible de charger vos clients. Vérifiez votre connexion et rechargez la page.
      </p>
    );
  }
  if (orders === null) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  const segmentOptions: { id: SegmentFilter; label: string }[] = [
    { id: "all", label: "Tous" },
    { id: "new", label: "Nouveaux" },
    { id: "loyal", label: "Fidèles" },
    { id: "inactive", label: "Inactifs" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-shell-text sm:text-3xl">
            Clients
          </h1>
          <p className="mt-1 text-sm text-shell-subtle">
            Toutes les personnes qui ont commandé dans votre boutique, en ligne ou en boutique.
          </p>
        </div>
        {clients.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              data-tour="clients-export"
              className="w-fit gap-1.5"
            >
              <Download aria-hidden className="size-4" />
              Exporter (CSV)
            </Button>
            <CoachMark label="Aide : export CSV">
              Télécharge la liste affichée (filtres compris) dans un fichier que vous pouvez
              ouvrir avec Excel ou Google Sheets, pour l&apos;imprimer ou préparer une campagne.
            </CoachMark>
          </div>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-shell-border bg-shell-surface px-6 py-16 text-center">
          <Users aria-hidden className="size-8 text-shell-faint" />
          <p className="font-medium text-shell-text">Pas encore de client</p>
          <p className="max-w-sm text-sm text-shell-subtle">
            Vos clients apparaîtront ici dès leur première commande, passée en ligne ou
            enregistrée par vous dans Commandes.
          </p>
        </div>
      ) : (
        <>
          <div data-tour="clients-segments" className="flex flex-wrap items-center gap-2">
            {segmentOptions.map((option) => (
              <span key={option.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={segment === option.id}
                  onClick={() => setSegment(option.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium",
                    segment === option.id
                      ? "border-shell-active bg-shell-active text-shell-active-text"
                      : "border-shell-border text-shell-muted hover:bg-shell-hover"
                  )}
                >
                  {option.label} · {counts[option.id]}
                </button>
                {option.id !== "all" && (
                  <CoachMark label={`Aide : clients ${option.label.toLowerCase()}`}>
                    {SEGMENT_HELP[option.id]}
                  </CoachMark>
                )}
              </span>
            ))}
          </div>

          <div data-tour="clients-search" className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-shell-subtle"
                />
                <input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Nom ou numéro de téléphone"
                  aria-label="Rechercher un client"
                  className="h-10 w-full rounded-lg border border-shell-border bg-shell-surface pl-9 text-sm outline-none placeholder:text-shell-subtle focus-visible:border-shell-border-strong"
                />
              </div>
              <CoachMark label="Aide : recherche de client">
                Tapez une partie du nom ou du numéro (avec ou sans indicatif, espaces
                compris) pour retrouver un client.
              </CoachMark>
            </div>
            <div className="flex items-center gap-2 sm:w-64">
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value as ClientSort)}
                aria-label="Trier les clients"
                className="h-10 flex-1"
              >
                <option value="recent">Commande la plus récente</option>
                <option value="spent">Total dépensé</option>
                <option value="orders">Nombre de commandes</option>
                <option value="name">Nom (A → Z)</option>
              </Select>
              <CoachMark label="Aide : tri des clients">
                « Total dépensé » met vos meilleurs clients en tête ; « Commande la plus
                récente », ceux qui viennent d&apos;acheter.
              </CoachMark>
            </div>
          </div>

          <div data-tour="clients-table" className="overflow-hidden rounded-xl border border-shell-border bg-shell-surface">
            {visible.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-shell-subtle">
                Aucun client ne correspond à votre recherche.
              </p>
            ) : (
              <ScrollableTable label="Liste des clients" hintClassName="pt-3">
                <table className="w-full min-w-160 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-shell-border text-left text-xs font-semibold tracking-wide text-shell-subtle uppercase">
                      <th className="px-3 py-2 sm:px-6">Client</th>
                      <th className="px-4 py-2">Téléphone</th>
                      <th className="px-4 py-2 text-right">Commandes</th>
                      <th className="px-4 py-2 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          Total dépensé
                          <CoachMark label="Aide : total dépensé">
                            Somme des commandes livrées de ce client. Les commandes en cours,
                            annulées ou retournées ne comptent pas.
                          </CoachMark>
                        </span>
                      </th>
                      <th className="px-4 py-2 sm:pr-6">Dernière commande</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-shell-border">
                    {visible.map((client) => (
                      <tr key={client.key}>
                        <td className="px-3 py-3 sm:px-6">
                          <div className={cn("flex flex-col items-start gap-1", STICKY_COLUMN_CONTENT)}>
                            <button
                              type="button"
                              onClick={() => setSelectedKey(client.key)}
                              aria-label={`Voir la fiche de ${client.name}`}
                              className="text-left font-medium text-shell-accent hover:underline"
                            >
                              {client.name}
                            </button>
                            <SegmentBadges segments={client.segments} />
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-shell-muted">
                          {client.phone || "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-shell-muted">
                          {client.ordersCount}
                        </td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-shell-text">
                          {money(client.totalSpent)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-shell-subtle sm:pr-6">
                          {DATE.format(client.lastOrderAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableTable>
            )}
          </div>
        </>
      )}

      <ClientDialog client={selected} onClose={() => setSelectedKey(null)} />
    </div>
  );
}
