import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { compatibilityScore, type ScoreInput } from "@/lib/compatibility";
import { z } from "zod";

export interface DiscoverCard {
  id: string;
  first_name: string;
  age: number;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
  interests: string[];
  personality: Record<string, string>;
  compatibility: number;
}

function wantsGender(pref: string | null, gender: string | null): boolean {
  if (!pref || pref === "everyone") return true;
  if (pref === "men") return gender === "man";
  if (pref === "women") return gender === "woman";
  return true;
}

async function buildFeed(
  context: { supabase: ReturnType<typeof Object> extends never ? never : any; userId: string },
  limit: number,
): Promise<DiscoverCard[]> {
  const supabase = context.supabase;
  const me = await supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
  if (!me.data || !me.data.is_complete) return [];

  const [likes, passes, matchesA, matchesB, blocked, blockedBy] = await Promise.all([
    supabase.from("likes").select("liked_id").eq("liker_id", context.userId),
    supabase.from("passes").select("passed_id").eq("passer_id", context.userId),
    supabase.from("matches").select("user_b").eq("user_a", context.userId),
    supabase.from("matches").select("user_a").eq("user_b", context.userId),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", context.userId),
    supabase.from("blocks").select("blocker_id").eq("blocked_id", context.userId),
  ]);

  const seen = new Set<string>([context.userId]);
  for (const r of likes.data ?? []) seen.add(r.liked_id);
  for (const r of passes.data ?? []) seen.add(r.passed_id);
  for (const r of matchesA.data ?? []) seen.add(r.user_b);
  for (const r of matchesB.data ?? []) seen.add(r.user_a);
  for (const r of blocked.data ?? []) seen.add(r.blocked_id);
  for (const r of blockedBy.data ?? []) seen.add(r.blocker_id);

  let query = supabase
    .from("public_profiles")
    .select("*")
    .eq("is_demo", me.data.is_demo === true)
    .limit(120);
  if (me.data.filter_city) query = query.ilike("city", me.data.filter_city);

  const candidates = await query;
  if (candidates.error) throw new Error(candidates.error.message);

  const mine: ScoreInput = {
    interests: me.data.interests ?? [],
    city: me.data.city,
    age: 0,
    minAge: me.data.min_age,
    maxAge: me.data.max_age,
    personality: me.data.personality ?? {},
  };
  const myAge = me.data.date_of_birth
    ? new Date().getUTCFullYear() - Number(me.data.date_of_birth.slice(0, 4))
    : 30;
  mine.age = myAge;

  const scored = (candidates.data ?? [])
    .filter((p: any) => !seen.has(p.id))
    .filter((p: any) => p.age >= me.data.min_age && p.age <= me.data.max_age)
    .filter((p: any) => wantsGender(me.data.preferred_gender, p.gender))
    .filter((p: any) => wantsGender(p.preferred_gender, me.data.gender))
    .map((p: any) => {
      const score = compatibilityScore(mine, {
        interests: p.interests ?? [],
        city: p.city,
        age: p.age,
        minAge: p.min_age,
        maxAge: p.max_age,
        personality: p.personality ?? {},
      });
      // Controlled randomness so the same kind of profile isn't always first.
      return { p, score, rank: score + Math.random() * 18 };
    })
    .sort((x: { rank: number }, y: { rank: number }) => y.rank - x.rank)
    .slice(0, limit);

  return scored.map(({ p, score }: { p: any; score: number }) => ({
    id: p.id,
    first_name: p.first_name,
    age: p.age,
    city: p.city,
    bio: p.bio,
    photo_url: p.photo_url,
    interests: p.interests ?? [],
    personality: (p.personality ?? {}) as Record<string, string>,
    compatibility: score,
  }));
}

export const getDiscoverFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildFeed(context as never, 12));

export const getDailyMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = await context.supabase
      .from("daily_matches")
      .select("target_id, opened")
      .eq("user_id", context.userId)
      .eq("day", today);

    if ((existing.data?.length ?? 0) > 0) {
      const feed = await buildFeed(context as never, 40);
      const ids = new Set((existing.data ?? []).map((d) => d.target_id));
      return feed.filter((c) => ids.has(c.id)).slice(0, 3);
    }

    const feed = await buildFeed(context as never, 3);
    if (feed.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("daily_matches").upsert(
        feed.map((c) => ({ user_id: context.userId, target_id: c.id, day: today })),
        { onConflict: "user_id,target_id,day" },
      );
    }
    return feed;
  });

const LIKE_LIMIT_PER_HOUR = 120;

export const reactToProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ targetId: z.string().uuid(), action: z.enum(["like", "pass"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    if (data.targetId === userId) throw new Error("You cannot react to your own profile.");

    const me = await context.supabase
      .from("profiles")
      .select("status, is_complete, interests, city, personality, min_age, max_age, date_of_birth")
      .eq("id", userId)
      .maybeSingle();
    if (!me.data || me.data.status !== "active" || !me.data.is_complete) {
      throw new Error("Your profile is not active.");
    }

    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await context.supabase
      .from("likes")
      .select("id")
      .eq("liker_id", userId)
      .gte("created_at", sinceIso);
    if (data.action === "like" && (recent.data?.length ?? 0) >= LIKE_LIMIT_PER_HOUR) {
      throw new Error("You've been very busy. Try again in a little while.");
    }

    // Streak: interacting with at least one profile keeps it alive.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const streak = await supabaseAdmin.from("streaks").select("*").eq("user_id", userId).maybeSingle();
    if (!streak.data) {
      await supabaseAdmin
        .from("streaks")
        .insert({ user_id: userId, current_streak: 1, longest_streak: 1, last_active_day: today });
    } else if (streak.data.last_active_day !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const next = streak.data.last_active_day === yesterday ? streak.data.current_streak + 1 : 1;
      await supabaseAdmin
        .from("streaks")
        .update({
          current_streak: next,
          longest_streak: Math.max(next, streak.data.longest_streak),
          last_active_day: today,
        })
        .eq("user_id", userId);
    }

    if (data.action === "pass") {
      await context.supabase.from("passes").insert({ passer_id: userId, passed_id: data.targetId });
      await context.supabase
        .from("analytics_events")
        .insert({ user_id: userId, event: "pass_sent", props: {} });
      return { matched: false as const };
    }

    await context.supabase.from("likes").insert({ liker_id: userId, liked_id: data.targetId });
    await context.supabase
      .from("analytics_events")
      .insert({ user_id: userId, event: "like_sent", props: {} });

    const reciprocal = await context.supabase
      .from("likes")
      .select("id")
      .eq("liker_id", data.targetId)
      .eq("liked_id", userId)
      .maybeSingle();

    if (!reciprocal.data) return { matched: false as const };

    const them = await supabaseAdmin
      .from("public_profiles")
      .select("*")
      .eq("id", data.targetId)
      .maybeSingle();
    const myAge = me.data.date_of_birth
      ? new Date().getUTCFullYear() - Number(me.data.date_of_birth.slice(0, 4))
      : 30;
    const score = them.data
      ? compatibilityScore(
          {
            interests: me.data.interests ?? [],
            city: me.data.city,
            age: myAge,
            minAge: me.data.min_age,
            maxAge: me.data.max_age,
            personality: (me.data.personality ?? {}) as Record<string, unknown>,
          },
          {
            interests: them.data.interests ?? [],
            city: them.data.city,
            age: them.data.age ?? 30,
            minAge: them.data.min_age ?? 18,
            maxAge: them.data.max_age ?? 99,
            personality: (them.data.personality ?? {}) as Record<string, unknown>,
          },
        )
      : 50;

    const pair = [userId, data.targetId].sort();
    const a = pair[0]!;
    const b = pair[1]!;
    const created = await supabaseAdmin
      .from("matches")
      .upsert({ user_a: a, user_b: b, compatibility: score }, { onConflict: "user_a,user_b" })
      .select("id, created_at")
      .maybeSingle();

    await supabaseAdmin
      .from("analytics_events")
      .insert({ user_id: userId, event: "match_created", props: {} });

    return {
      matched: true as const,
      matchId: created.data?.id ?? null,
      compatibility: score,
      them: them.data
        ? {
            id: them.data.id as string,
            first_name: them.data.first_name as string,
            photo_url: them.data.photo_url as string | null,
            interests: (them.data.interests ?? []) as string[],
            personality: (them.data.personality ?? {}) as Record<string, string>,
          }
        : null,
    };
  });

export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ event: z.string().max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("analytics_events")
      .insert({ user_id: context.userId, event: data.event, props: {} });
    return { ok: true };
  });
