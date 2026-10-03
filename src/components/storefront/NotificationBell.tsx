"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useNotifications } from "@/hooks/useNotifications";
import type { AppNotification } from "@/models/notification/Notification";
import { notificationService } from "@/services/NotificationService";
import { formatDateTime } from "@/lib/dateTime";

function formatDate(notification: AppNotification): string {
  const date = notification.createdAt?.toDate?.();
  return date
    ? formatDateTime(date)
    : "";
}

/**
 * Cloche de la vitrine (2026-10-02) : notifications du client connecté en
 * temps réel — commande livrée (invitation à donner son avis), réponse du
 * commerçant. Un clic marque la notification comme lue et ouvre la page
 * concernée. Rien pour un visiteur non connecté.
 */
export function NotificationBell() {
  const { firebaseUser } = useAuth();
  const router = useRouter();
  const notifications = useNotifications(firebaseUser?.uid);
  const [open, setOpen] = useState(false);

  if (!firebaseUser) return null;

  const unread = notifications.filter((notification) => !notification.read).length;

  function handleOpen(notification: AppNotification) {
    setOpen(false);
    if (!notification.read) {
      notificationService.markRead(notification.id).catch(() => {});
    }
    router.push(notification.link);
  }

  return (
    <div className="relative">
      <button
        data-tour="storefront-notifications"
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} non lue(s)` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          {/* Petit écran : panneau fixé aux marges de l'écran (ancré sous la
          cloche, il déborderait à gauche) ; plus large : sous la cloche. */}
          <div className="fixed inset-x-4 top-16 z-20 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-background py-2 shadow-lg sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80">
            <p className="px-3 py-1.5 text-sm font-semibold">Notifications</p>
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Aucune notification pour l&apos;instant.
              </p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleOpen(notification)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted"
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          notification.read ? "bg-transparent" : "bg-primary"
                        }`}
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className={`text-sm break-words ${
                            notification.read ? "text-muted-foreground" : "font-medium"
                          }`}
                        >
                          {notification.message}
                          {!notification.read && <span className="sr-only"> (non lue)</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(notification)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
