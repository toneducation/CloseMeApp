import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "node:crypto";
import { z } from "zod";

/**
 * Telegram + demo sign-in.
 *
 * The signed Telegram `initData` payload is verified here with the bot token
 * (server-only secret). Nothing the browser claims about identity is trusted.
 * On success we mint a one-time token the browser exchanges for a session.
 */

const APP_EMAIL_DOMAIN = "blindmatch.app";

function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (computed !== hash) return null;

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 60 * 60 * 24) return null;

  const rawUser = params.get("user");
  if (!rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as {
      id?: number;
      first_name?: string;
      username?: string;
    };
    if (!user.id) return null;
    return { user, startParam: params.get("start_param") };
  } catch {
    return null;
  }
}

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function ensureUserAndToken(
  admin: AdminClient,
  email: string,
  telegramId: number | null,
  telegramUsername: string | null,
  firstName: string | null,
  isDemo: boolean,
  referralCode: string | null,
) {
  // Find or create the auth user for this stable identity.
  let userId: string | null = null;
  const existing = await admin
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegramId ?? -1)
    .maybeSingle();
  if (existing.data?.id) userId = existing.data.id;

  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: { telegram_id: telegramId, is_demo: isDemo },
    });
    if (created.error || !created.data.user) {
      // Already registered from a previous run — look the id up by email.
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list.data?.users.find((u) => u.email === email);
      if (!found) throw new Error("Could not create or find account.");
      userId = found.id;
    } else {
      userId = created.data.user.id;
    }
  }

  // Referral attribution happens once, at first profile creation.
  let referredBy: string | null = null;
  if (referralCode) {
    const referrer = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();
    if (referrer.data?.id && referrer.data.id !== userId) referredBy = referrer.data.id;
  }

  const profile = await admin.from("profiles").select("id, referred_by").eq("id", userId).maybeSingle();
  if (!profile.data) {
    await admin.from("profiles").insert({
      id: userId,
      telegram_id: telegramId,
      telegram_username: telegramUsername,
      first_name: firstName,
      is_demo: isDemo,
      referred_by: referredBy,
    });
    if (referredBy) {
      await admin.from("referrals").insert({ referrer_id: referredBy, referred_id: userId });
      await admin
        .from("analytics_events")
        .insert({ user_id: userId, event: "referral_created", props: {} });
    }
  } else {
    await admin.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", userId);
  }

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data.properties?.hashed_token) {
    throw new Error("Could not start a session.");
  }
  return { tokenHash: link.data.properties.hashed_token, email };
}

export const telegramSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; ref?: string | null }) =>
    z.object({ initData: z.string().min(10), ref: z.string().max(64).nullish() }).parse(input),
  )
  .handler(async ({ data }) => {
    const botToken = process.env["TELEGRAM_BOT_TOKEN"];
    if (!botToken) throw new Error("Telegram sign-in is not configured yet.");

    const verified = verifyTelegramInitData(data.initData, botToken);
    if (!verified) throw new Error("We could not verify your Telegram session.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tg = verified.user;
    return ensureUserAndToken(
      supabaseAdmin,
      `tg${tg.id}@${APP_EMAIL_DOMAIN}`,
      tg.id!,
      tg.username ?? null,
      tg.first_name ?? null,
      false,
      data.ref ?? verified.startParam ?? null,
    );
  });

/**
 * Browser demo mode. Creates a clearly flagged demo account so the whole flow
 * can be exercised outside Telegram. Demo accounts only ever see demo people.
 */
export const demoSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: { slot: number; ref?: string | null }) =>
    z.object({ slot: z.number().int().min(1).max(8), ref: z.string().max(64).nullish() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pseudoTelegramId = -1000 - data.slot;
    return ensureUserAndToken(
      supabaseAdmin,
      `demo${data.slot}@${APP_EMAIL_DOMAIN}`,
      pseudoTelegramId,
      `demo_user_${data.slot}`,
      `Demo ${data.slot}`,
      true,
      data.ref ?? null,
    );
  });
