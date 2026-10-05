"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { Dialog, DialogClose, DialogPortal, DialogTitle } from "@/components/ui/dialog";

/** Glissement horizontal minimal (px) pour passer à l'image voisine. */
const SWIPE_DISTANCE = 50;
const ZOOM = 2.5;

/** Animation d'arrivée d'une photo selon le sens du changement
 * (tw-animate-css), coupée si l'appareil demande moins d'animations. */
const ENTER: Record<"next" | "previous" | "none", string> = {
  next: "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-16 motion-safe:duration-300",
  previous: "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-16 motion-safe:duration-300",
  none: "",
};

/**
 * Photos d'un produit en grand (2026-10-04) : plein écran, image suivante
 * ou précédente (flèches, clavier ←/→, glissement du doigt), zoom au clic
 * sur l'image (suit la souris), vignettes pour sauter à une photo.
 * Animations : la photo grandit à l'ouverture, glisse depuis le côté du
 * changement, suit le doigt pendant un glissement (2026-10-04).
 */
export function ProductImageLightbox({
  images,
  alts,
  index,
  onIndexChange,
  onClose,
  title,
}: {
  images: string[];
  alts: string[];
  /** Photo affichée ; `null` : fenêtre fermée. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  title: string;
}) {
  const open = index !== null && images.length > 0;
  // Dernière photo ouverte, gardée pendant l'animation de fermeture : sans
  // elle, la photo disparaîtrait d'un coup et seul le fond noir s'effacerait.
  const [lastIndex, setLastIndex] = useState(index);
  if (index !== null && index !== lastIndex) setLastIndex(index);
  const shownIndex = index ?? lastIndex;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* Ouverture et fermeture : fond en fondu, photo qui grandit (voir
          `Viewer`). Ni échelle ni déplacement sur la fenêtre elle-même. */}
      <DialogPortal className="group/lightbox top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-black p-0 text-white shadow-none duration-300 ease-out data-ending-style:scale-100 data-starting-style:scale-100 motion-reduce:transition-none">
        {shownIndex !== null && shownIndex < images.length && (
          <Viewer
            images={images}
            alts={alts}
            index={shownIndex}
            onIndexChange={onIndexChange}
            title={title}
          />
        )}
      </DialogPortal>
    </Dialog>
  );
}

function Viewer({
  images,
  alts,
  index,
  onIndexChange,
  title,
}: {
  images: string[];
  alts: string[];
  index: number;
  onIndexChange: (index: number) => void;
  title: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  /** Sens du dernier changement, pour l'animation d'arrivée. */
  const [direction, setDirection] = useState<"next" | "previous" | "none">("none");
  /** Décalage de la photo qui suit le doigt ; `null` hors glissement. */
  const [dragX, setDragX] = useState<number | null>(null);
  const swipeStart = useRef<number | null>(null);
  /** Un glissement se termine aussi par un « clic » : il ne doit pas zoomer. */
  const swiped = useRef(false);
  const many = images.length > 1;

  /** Change de photo, sans zoom. Le composant reste monté (pas de `key`) :
   * le drapeau `swiped` survit au changement de photo d'un glissement. */
  const show = (next: number, towards: "next" | "previous") => {
    if (next === index) return;
    setZoomed(false);
    setOrigin("50% 50%");
    setDirection(towards);
    onIndexChange(next);
  };
  const go = (delta: 1 | -1) =>
    show((index + delta + images.length) % images.length, delta > 0 ? "next" : "previous");

  function originFrom(event: React.PointerEvent | React.MouseEvent) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    return `${x}% ${y}%`;
  }

  function endSwipe(clientX: number | null) {
    const start = swipeStart.current;
    swipeStart.current = null;
    setDragX(null);
    if (start === null || clientX === null || !many || zoomed) return;
    const dx = clientX - start;
    if (Math.abs(dx) >= SWIPE_DISTANCE) {
      swiped.current = true;
      go(dx < 0 ? 1 : -1);
    }
  }

  const dragging = dragX !== null && dragX !== 0;

  return (
    <div
      className="flex h-full flex-col outline-none"
      onKeyDown={(event) => {
        if (!many) return;
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300">
        <DialogTitle className="min-w-0 truncate text-sm font-medium text-white/90">{title}</DialogTitle>
        <div className="flex shrink-0 items-center gap-3">
          {many && (
            <span
              key={index}
              className="text-sm text-white/70 tabular-nums motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              aria-live="polite"
            >
              {index + 1} / {images.length}
            </span>
          )}
          <DialogClose
            aria-label="Fermer"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:rotate-90 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-90 motion-reduce:transition-none motion-reduce:hover:rotate-0"
          >
            <X className="size-5" />
          </DialogClose>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-pan-y overflow-hidden"
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" || zoomed || !many) return;
          swipeStart.current = event.clientX;
          setDragX(0);
        }}
        onPointerMove={(event) => {
          if (swipeStart.current === null) return;
          setDragX(event.clientX - swipeStart.current);
        }}
        onPointerUp={(event) => endSwipe(event.clientX)}
        onPointerCancel={() => endSwipe(null)}
      >
        {/* Ouverture : la photo grandit avec le fondu de la fenêtre ;
            fermeture : elle rapetisse pendant que le fond s'efface. */}
        <div className="absolute inset-0 transition-transform duration-300 ease-out group-data-ending-style/lightbox:scale-90 motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-300 motion-reduce:transition-none">
          {/* Suit le doigt ; revient en place (ressort) si le geste est trop court. */}
          <div
            className={`absolute inset-0 ${dragging ? "" : "transition-[transform,opacity] duration-200 ease-out"}`}
            style={
              dragging
                ? { transform: `translateX(${dragX}px)`, opacity: Math.max(0.4, 1 - Math.abs(dragX) / 600) }
                : undefined
            }
          >
            {/* Nouvelle photo à chaque changement (`key`) : elle arrive du
                côté du mouvement, et le navigateur ne garde pas l'ancienne
                affichée pendant le chargement de la suivante. */}
            <div key={images[index]} className={`absolute inset-0 ${ENTER[direction]}`}>
              <button
                type="button"
                aria-label={zoomed ? "Dézoomer" : "Zoomer sur la photo"}
                onClick={(event) => {
                  if (swiped.current) {
                    swiped.current = false;
                    return;
                  }
                  setOrigin(originFrom(event));
                  setZoomed((z) => !z);
                }}
                onPointerMove={(event) => zoomed && event.pointerType === "mouse" && setOrigin(originFrom(event))}
                className={`absolute inset-0 focus-visible:outline-none ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              >
                <Image
                  src={images[index]}
                  alt={alts[index] ?? ""}
                  fill
                  sizes="100vw"
                  loading="eager"
                  className="object-contain transition-transform duration-300 ease-out motion-reduce:transition-none"
                  style={{ transform: zoomed ? `scale(${ZOOM})` : undefined, transformOrigin: origin }}
                />
              </button>
            </div>
          </div>
        </div>

        {many && (
          <>
            <button
              type="button"
              aria-label="Photo précédente"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition hover:scale-110 hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-95 motion-reduce:transition-none sm:left-4"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Photo suivante"
              onClick={() => go(1)}
              className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition hover:scale-110 hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-95 motion-reduce:transition-none sm:right-4"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>

      {many && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
          {images.map((image, i) => (
            <button
              key={image}
              type="button"
              aria-label={`Voir la photo ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => show(i, i > index ? "next" : "previous")}
              className={`relative size-14 shrink-0 overflow-hidden rounded-md border-2 bg-white/5 transition duration-200 focus-visible:outline-none motion-reduce:transition-none ${
                i === index
                  ? "scale-105 border-white"
                  : "border-transparent opacity-60 hover:opacity-100 focus-visible:border-white/70"
              }`}
            >
              <Image src={image} alt="" fill sizes="56px" className="object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
