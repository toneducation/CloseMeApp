import { supabase } from "@/integrations/supabase/client";
import { telegramSignIn, demoSignIn } from "@/lib/auth.functions";
import { getTelegramInitData, getStartParam, isTelegramAvailable } from "@/lib/telegram";

const DEMO_SLOT_KEY = "blindmatch.demo.slot";

async function exchange(result: { tokenHash: string; email: string }) {
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: result.tokenHash,
  });
  if (error) throw new Error(error.message);
}

export async function signInWithTelegram() {
  const initData = getTelegramInitData();
  if (!initData) throw new Error("Telegram session data is unavailable.");
  const result = await telegramSignIn({ data: { initData, ref: getStartParam() } });
  await exchange(result);
}

export async function signInAsDemo() {
  let slot = Number(localStorage.getItem(DEMO_SLOT_KEY) ?? 0);
  if (!slot || slot < 1 || slot > 8) {
    slot = Math.floor(Math.random() * 8) + 1;
    localStorage.setItem(DEMO_SLOT_KEY, String(slot));
  }
  const result = await demoSignIn({ data: { slot, ref: getStartParam() } });
  await exchange(result);
}

export const canUseTelegram = isTelegramAvailable;

export async function signOut() {
  await supabase.auth.signOut();
}
