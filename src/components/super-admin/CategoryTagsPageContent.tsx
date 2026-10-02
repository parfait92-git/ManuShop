"use client";

import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogTour } from "@/components/onboarding/DialogTour";
import type { CategoryTag } from "@/models/category/CategoryTag";
import { categoryTagService } from "@/services/CategoryTagService";

const DEFAULT_COLOR = "#2563eb";

function CreateTagForm({ onCreated }: { onCreated: (tag: CategoryTag) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { id } = await categoryTagService.createTag(name, color);
      onCreated({
        id,
        name: name.trim(),
        color,
        createdAt: { toDate: () => new Date() } as never,
      });
      setName("");
      setColor(DEFAULT_COLOR);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de la création du tag. Réessayez."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Plus className="size-4.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Créer un tag</h2>
          <p className="text-sm text-muted-foreground">
            Visible par tous les commerçants en créant une catégorie.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="tag-name">Nom du tag</Label>
          <Input
            id="tag-name"
            placeholder="Ex. Alimentation"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tag-color">Couleur</Label>
          <Input
            id="tag-color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-9 w-16 p-1"
          />
        </div>
        <Button type="submit" disabled={submitting || !name.trim()} className="gap-1.5">
          <Plus className="size-4" />
          {submitting ? "Création..." : "Créer"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

/**
 * Seul moyen de renommer/changer la couleur d'un tag déjà créé — jusque-là,
 * il fallait le supprimer et en recréer un (signalé par l'utilisateur).
 */
function EditTagDialog({
  tag,
  open,
  onOpenChange,
  onSaved,
}: {
  tag: CategoryTag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (tag: CategoryTag) => void;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(tag.name);
    setColor(tag.color);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await categoryTagService.updateTag(tag.id, name, color);
      onSaved({ ...tag, name: name.trim(), color });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de la mise à jour du tag. Réessayez."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogPortal className="max-w-md">
        <div className="flex items-start justify-between gap-3">
          <DialogTitle>Modifier le tag</DialogTitle>
          <DialogTour tourId="dialog-edit-tag" />
        </div>
        <DialogDescription>
          Visible par tous les commerçants en créant une catégorie.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div data-tour="edit-tag-name" className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-tag-name">Nom du tag</Label>
              <Input
                id="edit-tag-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div data-tour="edit-tag-color" className="flex flex-col gap-1.5">
              <Label htmlFor="edit-tag-color">Couleur</Label>
              <Input
                id="edit-tag-color"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-9 w-16 p-1"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button data-tour="edit-tag-save" type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogPortal>
    </Dialog>
  );
}

/**
 * BF-109→111 : taxonomie système — un commerçant choisit un de ces tags en
 * créant une catégorie plutôt que d'en inventer un (pas encore branché côté
 * commerçant, voir 04-besoins-techniques.md §36 : périmètre volontairement
 * limité à la gestion Super Admin pour cette tranche).
 */
export function CategoryTagsPageContent() {
  const [tags, setTags] = useState<CategoryTag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<CategoryTag | null>(null);

  useEffect(() => {
    let active = true;
    categoryTagService
      .listTags()
      .then((data) => {
        if (active) setTags(data);
      })
      .catch((err) => {
        // Sans ce log, un vrai échec (règles Firestore pas encore
        // republiées, réseau...) se replie silencieusement sur ce même
        // message générique, indiscernable en apparence d'une collection
        // réellement vide — voir 04-besoins-techniques.md §31.
        console.error(
          "CategoryTagsPageContent : échec du chargement des tags",
          err
        );
        if (active) {
          setTags([]);
          setError("Échec du chargement des tags. Réessayez.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function handleCreated(tag: CategoryTag) {
    setTags((current) => [...(current ?? []), tag]);
    setError(null);
  }

  function handleSaved(tag: CategoryTag) {
    setTags((current) =>
      current?.map((t) => (t.id === tag.id ? tag : t)) ?? current
    );
  }

  async function handleDelete(tag: CategoryTag) {
    const confirmed = window.confirm(
      `Supprimer le tag « ${tag.name} » ? Les catégories qui l'utilisent déjà le garderont en référence, mais il ne sera plus proposé.`
    );
    if (!confirmed) return;

    setDeletingId(tag.id);
    setError(null);
    try {
      await categoryTagService.deleteTag(tag.id);
      setTags((current) => current?.filter((t) => t.id !== tag.id) ?? current);
    } catch {
      setError("Échec de la suppression du tag. Réessayez.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tags de catégorie
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Liste système, gérée exclusivement ici — les commerçants en
          choisissent un plutôt que d&apos;inventer leurs propres catégories.
        </p>
      </div>

      <div data-tour="tags-create">

        <CreateTagForm onCreated={handleCreated} />

      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {tags === null ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Tag className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Aucun tag pour le moment — créez-en un ci-dessus.
          </p>
        </div>
      ) : (
        <ul data-tour="tags-list" className="divide-y divide-border rounded-xl border border-border bg-background">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
            >
              <span
                className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                onDoubleClick={() => setEditingTag(tag)}
                title="Double-cliquez pour modifier"
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditingTag(tag)}
                  aria-label={`Modifier ${tag.name}`}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={deletingId === tag.id}
                  onClick={() => handleDelete(tag)}
                  aria-label={`Supprimer ${tag.name}`}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingTag && (
        <EditTagDialog
          tag={editingTag}
          open={!!editingTag}
          onOpenChange={(open) => {
            if (!open) setEditingTag(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
