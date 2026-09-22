"use client";

import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@/models/user/User";
import { platformAdminService } from "@/services/PlatformAdminService";

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Admin",
  seller: "Vendeur",
  client: "Client",
};

function UserRow({
  user,
  onChanged,
}: {
  user: User;
  onChanged: (user: User) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user.role === "admin";

  async function handleGrant() {
    setPending(true);
    setError(null);
    try {
      await platformAdminService.grantAdmin(user.id);
      onChanged({ ...user, role: "admin", adminSource: "manual" });
    } catch {
      setError("Échec de l'attribution. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  async function handleRevoke() {
    const confirmed = window.confirm(
      `Retirer le rôle admin à « ${user.displayName} » ?`
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    try {
      await platformAdminService.revokeAdmin(user.id);
      onChanged({ ...user, role: "client" });
    } catch {
      setError("Échec du retrait. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{user.displayName}</span>
        <span className="text-sm text-muted-foreground">
          {user.email ?? user.phone ?? "—"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {ROLE_LABELS[user.role]}
          {user.role === "admin" && user.adminSource === "manual" && " (manuel)"}
          {user.role === "admin" &&
            user.adminSource === "subscription" &&
            " (abonnement)"}
        </span>
        {isAdmin ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleRevoke}
            className="gap-1.5 text-destructive hover:bg-destructive/10"
          >
            <ShieldOff className="size-4" />
            Retirer l&apos;admin
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleGrant}
            className="gap-1.5"
          >
            <ShieldCheck className="size-4" />
            Donner l&apos;admin
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive sm:hidden">{error}</p>}
    </li>
  );
}

export function SuperAdminPanel() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<User[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const users = await platformAdminService.searchUsers(term);
      setResults(users);
    } catch {
      setError("La recherche a échoué. Réessayez.");
    } finally {
      setSearching(false);
    }
  }

  function handleChanged(updated: User) {
    setResults((current) =>
      current
        ? current.map((u) => (u.id === updated.id ? updated : u))
        : current
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Super Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recherchez un compte par pseudo, email ou téléphone pour lui donner
          ou lui retirer le rôle admin.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Pseudo, email ou téléphone..."
            aria-label="Rechercher un utilisateur"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={searching}>
          {searching ? "Recherche..." : "Rechercher"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {results !== null && (
        <div className="rounded-xl border border-border bg-background">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aucun utilisateur ne correspond à cette recherche.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((user) => (
                <UserRow key={user.id} user={user} onChanged={handleChanged} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
