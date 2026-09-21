import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { icebreakers } from "@/lib/compatibility";
import { z } from "zod";

export const getMyMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const matches = await context.supabase
      .from("matches")
      .select("id, user_a, user_b, compatibility, created_at")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (matches.error) throw new Error(matches.error.message);
    const rows = matches.data ?? [];
    if (rows.length === 0) return [];

    const otherIds = rows.map((m) => (m.user_a === userId ? m.user_b : m.user_a));
    const [profiles, messages] = await Promise.all([
      context.supabase
        .from("public_profiles")
        .select("id, first_name, age, city, photo_url, interests, personality")
        .in("id", otherIds),
      context.supabase
        .from("messages")
        .select("match_id, body, created_at, sender_id, read_at")
        .in(
          "match_id",
          rows.map((m) => m.id),
        )
        .order("created_at", { ascending: false }),
    ]);

    return rows
      .map((m) => {
        const otherId = m.user_a === userId ? m.user_b : m.user_a;
        const person = profiles.data?.find((p) => p.id === otherId);
        const thread = (messages.data ?? []).filter((x) => x.match_id === m.id);
        const unread = thread.filter((x) => x.sender_id !== userId && !x.read_at).length;
        return {
          matchId: m.id,
          compatibility: m.compatibility,
          createdAt: m.created_at,
          unread,
          lastMessage: thread[0]?.body ?? null,
          lastMessageAt: thread[0]?.created_at ?? null,
          person: person
            ? {
                id: person.id as string,
                first_name: person.first_name as string,
                age: person.age as number,
                city: person.city as string | null,
                photo_url: person.photo_url as string | null,
                interests: (person.interests ?? []) as string[],
              }
            : null,
        };
      })
      .filter((m) => m.person !== null);
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ matchId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const match = await context.supabase
      .from("matches")
      .select("id, user_a, user_b, compatibility")
      .eq("id", data.matchId)
      .maybeSingle();
    if (match.error) throw new Error(match.error.message);
    if (!match.data) throw new Error("This conversation is not available.");

    const otherId = match.data.user_a === userId ? match.data.user_b : match.data.user_a;
    const [person, me, messages] = await Promise.all([
      context.supabase
        .from("public_profiles")
        .select("id, first_name, age, city, photo_url, interests, personality")
        .eq("id", otherId)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("interests, personality, messaging_disabled")
        .eq("id", userId)
        .maybeSingle(),
      context.supabase
        .from("messages")
        .select("id, sender_id, body, created_at, read_at")
        .eq("match_id", data.matchId)
        .order("created_at", { ascending: true }),
    ]);

    await context.supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("match_id", data.matchId)
      .eq("receiver_id", userId)
      .is("read_at", null);

    return {
      matchId: data.matchId,
      compatibility: match.data.compatibility,
      canSend: me.data?.messaging_disabled !== true,
      person: person.data
        ? {
            id: person.data.id as string,
            first_name: person.data.first_name as string,
            age: person.data.age as number,
            city: person.data.city as string | null,
            photo_url: person.data.photo_url as string | null,
          }
        : null,
      icebreakers: icebreakers(
        (person.data?.first_name as string | null) ?? "they",
        (me.data?.interests ?? []) as string[],
        (person.data?.interests ?? []) as string[],
        (person.data?.personality ?? {}) as Record<string, unknown>,
      ),
      messages: (messages.data ?? []).map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.created_at,
        mine: m.sender_id === userId,
        readAt: m.read_at,
      })),
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ matchId: z.string().uuid(), body: z.string().trim().min(1).max(2000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const match = await context.supabase
      .from("matches")
      .select("user_a, user_b")
      .eq("id", data.matchId)
      .maybeSingle();
    if (!match.data) throw new Error("This conversation is not available.");
    const receiverId = match.data.user_a === userId ? match.data.user_b : match.data.user_a;

    const sinceIso = new Date(Date.now() - 60 * 1000).toISOString();
    const recent = await context.supabase
      .from("messages")
      .select("id")
      .eq("sender_id", userId)
      .gte("created_at", sinceIso);
    if ((recent.data?.length ?? 0) >= 25) {
      throw new Error("Slow down a little — try again in a minute.");
    }

    const { error } = await context.supabase.from("messages").insert({
      match_id: data.matchId,
      sender_id: userId,
      receiver_id: receiverId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("analytics_events")
      .insert({ user_id: userId, event: "message_sent", props: {} });
    return { ok: true };
  });

export const blockPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You cannot block yourself.");
    const { error } = await context.supabase
      .from("blocks")
      .upsert(
        { blocker_id: context.userId, blocked_id: data.userId },
        { onConflict: "blocker_id,blocked_id" },
      );
    if (error) throw new Error(error.message);

    // Blocking removes the pair from each other's matches immediately.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [a, b] = [context.userId, data.userId].sort();
    await supabaseAdmin.from("matches").delete().eq("user_a", a).eq("user_b", b);
    return { ok: true };
  });

const categories = [
  "spam",
  "fake_profile",
  "harassment",
  "inappropriate",
  "underage",
  "scam",
  "threat",
  "other",
] as const;

export const reportPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        category: z.enum(categories),
        description: z.string().trim().max(1000).default(""),
        matchId: z.string().uuid().nullish(),
        alsoBlock: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You cannot report yourself.");

    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await context.supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", context.userId)
      .gte("created_at", sinceIso);
    if ((recent.data?.length ?? 0) >= 10) {
      throw new Error("Too many reports in a short time. Please try again later.");
    }

    const priority =
      data.category === "threat" || data.category === "underage"
        ? 3
        : data.category === "harassment" || data.category === "scam"
          ? 2
          : 1;

    const { error } = await context.supabase.from("reports").insert({
      reporter_id: context.userId,
      reported_id: data.userId,
      match_id: data.matchId ?? null,
      category: data.category,
      description: data.description,
      priority,
    });
    if (error) throw new Error(error.message);

    if (data.alsoBlock) {
      await context.supabase
        .from("blocks")
        .upsert(
          { blocker_id: context.userId, blocked_id: data.userId },
          { onConflict: "blocker_id,blocked_id" },
        );
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [a, b] = [context.userId, data.userId].sort();
      await supabaseAdmin.from("matches").delete().eq("user_a", a).eq("user_b", b);
    }
    return { ok: true };
  });
