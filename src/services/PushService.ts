import { auth } from "@/lib/firebase";
import { releasePushToken, requestPushToken, storedPushToken } from "@/lib/push";
import {
  registerPushTokenAction,
  sendTestPushAction,
  unregisterPushTokenAction,
} from "@/server/actions/client/pushActions";

async function idToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Vous devez être connecté.");
  return token;
}

/** Notifications push de cet appareil pour le compte connecté (2026-10-04). */
export class PushService {
  /** Active : autorisation, jeton, inscription. `false` si l'utilisateur
   * refuse l'autorisation. */
  async enable(): Promise<boolean> {
    const token = await requestPushToken();
    if (!token) return false;
    await registerPushTokenAction(await idToken(), token, navigator.userAgent);
    return true;
  }

  async disable(): Promise<void> {
    const token = storedPushToken();
    if (token) await unregisterPushTokenAction(await idToken(), token).catch(() => {});
    await releasePushToken();
  }

  /** Réinscrit l'appareil (jeton renouvelé, autre compte connecté). */
  async refresh(): Promise<void> {
    if (!storedPushToken() || Notification.permission !== "granted") return;
    const token = await requestPushToken();
    if (token) await registerPushTokenAction(await idToken(), token, navigator.userAgent);
  }

  async sendTest(): Promise<number> {
    return (await sendTestPushAction(await idToken())).sent;
  }

  isEnabledHere(): boolean {
    return !!storedPushToken() && typeof Notification !== "undefined" && Notification.permission === "granted";
  }
}

export const pushService = new PushService();
