/**
 * Thin abstraction over the Telegram WebApp SDK so the app also runs in a
 * normal browser (development / demo mode).
 */

export interface TelegramUserInfo {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: { user?: TelegramUserInfo; start_param?: string };
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
  openTelegramLink?: (url: string) => void;
  HapticFeedback?: {
    impactOccurred?: (style: string) => void;
    notificationOccurred?: (type: string) => void;
  };
  setHeaderColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function webApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

let initialised = false;

/** Call Telegram.WebApp.ready() + expand() exactly once. */
export function initTelegram(): void {
  const app = webApp();
  if (!app || initialised) return;
  initialised = true;
  try {
    app.ready();
    app.expand();
    app.enableClosingConfirmation?.();
  } catch {
    /* Telegram host may not support every method */
  }
}

export function isTelegramAvailable(): boolean {
  const app = webApp();
  return Boolean(app && app.initData && app.initData.length > 0);
}

/** Raw signed payload — only ever sent to our own server for verification. */
export function getTelegramInitData(): string | null {
  const app = webApp();
  return app?.initData && app.initData.length > 0 ? app.initData : null;
}

export function getTelegramUser(): TelegramUserInfo | null {
  return webApp()?.initDataUnsafe?.user ?? null;
}

export function getStartParam(): string | null {
  const app = webApp();
  if (app?.initDataUnsafe?.start_param) return app.initDataUnsafe.start_param;
  if (typeof window !== "undefined") {
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    if (fromUrl) return fromUrl;
  }
  return null;
}

export function haptic(kind: "light" | "medium" | "heavy" | "success" | "error" = "light"): void {
  const h = webApp()?.HapticFeedback;
  if (!h) return;
  try {
    if (kind === "success" || kind === "error") h.notificationOccurred?.(kind);
    else h.impactOccurred?.(kind);
  } catch {
    /* ignore */
  }
}

export function shareToTelegram(text: string, url: string): void {
  const link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const app = webApp();
  if (app?.openTelegramLink) app.openTelegramLink(link);
  else if (typeof window !== "undefined") window.open(link, "_blank", "noopener");
}
