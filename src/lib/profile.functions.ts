import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const genders = ["man", "woman", "nonbinary", "unspecified"] as const;
const prefs = ["men", "women", "everyone"] as const;

const profileSchema = z.object({
  first_name: z.string().trim().min(2).max(40),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(genders),
  preferred_gender: z.enum(prefs),
  city: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(400).default(""),
  photo_url: z.string().trim().max(400).nullable().default(null),
  interests: z.array(z.string().trim().min(1).max(30)).max(15),
  personality: z.record(z.string().max(300)).default({}),
});

function ageFrom(dob: string): number {
  const birth = new Date(dob + "T00:00:00Z");
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

export const getMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      ...data,
      age: data.date_of_birth ? ageFrom(data.date_of_birth) : null,
      // Never hand the raw date of birth to the browser.
      date_of_birth_year: data.date_of_birth ? Number(data.date_of_birth.slice(0, 4)) : null,
      date_of_birth: undefined as undefined,
    };
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (ageFrom(data.date_of_birth) < 18) {
      throw new Error("You must be 18 or older to use BlindMatch.");
    }
    const complete =
      data.first_name.length >= 2 &&
      data.city.length >= 2 &&
      data.interests.length >= 1 &&
      Boolean(data.photo_url);

    const { error } = await context.supabase
      .from("profiles")
      .update({
        first_name: data.first_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        preferred_gender: data.preferred_gender,
        city: data.city,
        bio: data.bio,
        photo_url: data.photo_url,
        interests: data.interests,
        personality: data.personality,
        is_complete: complete,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    await context.supabase.from("analytics_events").insert({
      user_id: context.userId,
      event: complete ? "profile_completed" : "profile_created",
      props: {},
    });
    return { ok: true, complete };
  });

export const saveMyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        min_age: z.number().int().min(18).max(99),
        max_age: z.number().int().min(18).max(99),
        preferred_gender: z.enum(prefs),
        filter_city: z.string().trim().max(60).nullable(),
      })
      .refine((v) => v.max_age >= v.min_age, { message: "Age range is inverted." })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    await supabaseAdmin.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await supabaseAdmin.from("matches").delete().or(`user_a.eq.${userId},user_b.eq.${userId}`);
    await supabaseAdmin.from("likes").delete().or(`liker_id.eq.${userId},liked_id.eq.${userId}`);
    await supabaseAdmin.from("passes").delete().or(`passer_id.eq.${userId},passed_id.eq.${userId}`);
    await supabaseAdmin.from("blocks").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    await supabaseAdmin.from("daily_matches").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { ok: true };
  });

export const getMyBlocks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const blocks = await context.supabase
      .from("blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", context.userId);
    if (blocks.error) throw new Error(blocks.error.message);
    const ids = (blocks.data ?? []).map((b) => b.blocked_id);
    if (ids.length === 0) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profiles = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, city, photo_url")
      .in("id", ids);
    return (blocks.data ?? []).map((b) => {
      const p = profiles.data?.find((x) => x.id === b.blocked_id);
      return {
        id: b.blocked_id,
        created_at: b.created_at,
        first_name: p?.first_name ?? "Someone",
        city: p?.city ?? null,
        photo_url: p?.photo_url ?? null,
      };
    });
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", context.userId)
      .eq("blocked_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [streak, referrals, profile] = await Promise.all([
      context.supabase.from("streaks").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("referrals").select("id").eq("referrer_id", context.userId),
      context.supabase.from("profiles").select("referral_code").eq("id", context.userId).maybeSingle(),
    ]);
    return {
      streak: streak.data?.current_streak ?? 0,
      longest: streak.data?.longest_streak ?? 0,
      invites: referrals.data?.length ?? 0,
      referralCode: profile.data?.referral_code ?? null,
    };
  });
