"use client";

import { AlertTriangle, Lock, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { buttonVariants } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { authService } from "@/services/AuthService";

type ErrorCode = "401" | "403" | "already-authenticated";

const ERROR_CONTENT: Record<
  ErrorCode,
  {
    icon: typeof Lock;
    title: string;
    message: string;
    actionLabel: string;
    actionHref: string;
  }
> = {
  "401": {
    icon: Lock,
    title: "Connexion requise",
    message: "Vous devez être connecté pour accéder à cette page.",
    actionLabel: "Se connecter",
    actionHref: "/login",
  },
  "403": {
    icon: ShieldOff,
    title: "Accès refusé",
    message: "Votre compte n'a pas les droits nécessaires pour accéder à cette page.",
    actionLabel: "Retour au tableau de bord",
    actionHref: "/dashboard",
  },
  "already-authenticated": {
    icon: AlertTriangle,
    title: "Déjà connecté",
    message: "Vous êtes déjà connecté : cette page ne vous concerne pas.",
    actionLabel: "Aller au tableau de bord",
    actionHref: "/dashboard",
  },
};

const DEFAULT_CONTENT = {
  icon: AlertTriangle,
  title: "Page non disponible",
  message: "Cette page n'est pas accessible dans ces conditions.",
  actionLabel: "Retour à l'accueil",
  actionHref: "/",
};

function isErrorCode(value: string | null): value is ErrorCode {
  return value !== null && value in ERROR_CONTENT;
}

export default function ErreurPage() {
  // Lu via window.location plutôt que useSearchParams() : évite d'imposer un
  // Suspense boundary pour une page purement informative (même choix que
  // CataloguePageContent).
  const [code, setCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const { firebaseUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      setCode(params.get("code"));
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  const content = isErrorCode(code) ? ERROR_CONTENT[code] : DEFAULT_CONTENT;
  const Icon = content.icon;

  async function handleLogout() {
    await authService.logout();
    router.push("/login");
  }

  return (
    <LiquidGlassCard className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full bg-white/10"
      >
        <Icon className="size-6 text-cyan-300" />
      </span>
      <div>
        <h1 className="text-2xl font-semibold text-white">{content.title}</h1>
        <p className="mt-1 text-sm text-white/70">{content.message}</p>
      </div>
      {/* Un <Link> stylé en bouton, pas <Button render={<Link/>}> : Base UI
      documente explicitement qu'un lien ne doit pas recevoir la sémantique
      bouton via `render` (rôle/clavier en plus de ses propres sémantiques
      natives). */}
      <Link
        href={content.actionHref}
        className={buttonVariants({ className: "w-full" })}
      >
        {content.actionLabel}
      </Link>
      {/* Échappatoire toujours visible : sans ça, un compte authentifié mais
      sans le bon rôle boucle indéfiniment entre cette page et sa cible
      (ex. /erreur?code=403 -> /dashboard -> /erreur?code=403...) sans aucun
      moyen de s'en sortir. */}
      {firebaseUser && (
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          Se déconnecter
        </button>
      )}
    </LiquidGlassCard>
  );
}
