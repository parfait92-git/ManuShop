export type NotificationSoundKind = "order" | "orderStatus" | "message";

// Une hauteur distincte par type d'événement plutôt qu'un bip unique — aide
// à distinguer "nouvelle commande" d'un simple changement de statut sans
// devoir regarder l'écran.
const FREQUENCY_HZ: Record<NotificationSoundKind, number> = {
  order: 880,
  orderStatus: 660,
  message: 523,
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
}

/**
 * Bip généré directement (Web Audio API), aucun fichier audio à fournir —
 * aucun outil de navigateur/E2E dans cette session pour vérifier un vrai
 * fichier, et le projet n'en avait aucun jusqu'ici. Les navigateurs
 * suspendent `AudioContext` tant qu'aucune interaction utilisateur n'a eu
 * lieu sur la page ; comme le dashboard nécessite déjà une navigation/un
 * clic pour y arriver, le contexte est presque toujours déjà actif en
 * pratique. Ne fait rien si l'API est indisponible (SSR, jsdom, navigateur
 * trop ancien) plutôt que de lever une erreur.
 */
export function playNotificationSound(kind: NotificationSoundKind): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = FREQUENCY_HZ[kind];

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.35);
}
