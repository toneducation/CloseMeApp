import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Staff console backend.
 *
 * Every function here re-checks the caller's staff role server-side against
 * admin_users (never a client flag), and every sensitive action writes an
 * immutable audit row. Nothing in this file trusts the browser.
 */

type Role = "SUPER_ADMIN" | "MODERATOR" | "SUPPORT";

const CAN: Record<string, Role[]> = {
  VIEW_USER: ["SUPER_ADMIN", "MODERATOR", "SUPPORT"],
  VIEW_REPORTS: ["SUPER_ADMIN", "MODERATOR"],
  RESOLVE_REPORT: ["SUPER_ADMIN", "MODERATOR"],
  VIEW_REPORTED_CONVERSATION: ["SUPER_ADMIN", "MODERATOR"],
  SUSPEND_USER: ["SUPER_ADMIN", "MODERATOR"],
  BAN_USER: ["SUPER_ADMIN", "MODERATOR"],
  UNBAN_USER: ["SUPER_ADMIN", "MODERATOR"],
  DELETE_PROFILE: ["SUPER_ADMIN"],
  VIEW_SECURITY: ["SUPER_ADMIN", "MODERATOR"],
  VIEW_AUDIT: ["SUPER_ADMIN"],
  CHANGE_ADMIN_ROLE: ["SUPER_ADMIN"],
};

async function staffContext(userId: string, permission?: keyof typeof CAN) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = await supabaseAdmin
    .from("admin_users")
    .select("user_id, email, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!admin.data) throw new Error("Not authorised.");
  const role = admin.data.role as Role;
  if (permission && !CAN[permission]!.includes(role)) {
    throw new Error("Your role does not allow this action.");
  }
  return { db: supabaseAdmin, role, adminId: userId, email: admin.data.email };
}

async function audit(
  ctx: Awaited<ReturnType<typeof staffContext>>,
  action: string,
  fields: {
    targetUserId?: string | null;
    targetResourceId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  await ctx.db.from("audit_logs").insert({
    admin_id: ctx.adminId,
    admin_role: ctx.role,
    action,
    target_user_id: fields.targetUserId ?? null,
    target_resource_id: fields.targetResourceId ?? null,
    reason: fields.reason ?? null,
    metadata: (fields.metadata ?? {}) as never,
  });
}

/** Who am I, as far as the staff console is concerned? */
export const staffMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = await supabaseAdmin
      .from("admin_users")
      .select("role, email")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!admin.data) return null;
    return { role: admin.data.role as Role, email: admin.data.email };
  });

/** Is the console still waiting for its very first administrator? */
export const staffNeedsBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = await supabaseAdmin.from("admin_users").select("user_id").limit(1);
  return { needsBootstrap: (rows.data?.length ?? 0) === 0 };
});

/**
 * One-time creation of the first SUPER_ADMIN, protected by the
 * ADMIN_BOOTSTRAP_CODE project secret. Refuses once any admin exists.
 */
export const staffBootstrap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(12).max(200),
        code: z.string().min(8).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_BOOTSTRAP_CODE"];
    if (!expected) throw new Error("Admin setup is not configured yet.");
    if (data.code !== expected) throw new Error("That setup code is not correct.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin.from("admin_users").select("user_id").limit(1);
    if ((existing.data?.length ?? 0) > 0) throw new Error("An administrator already exists.");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { staff: true },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Could not create the administrator.");
    }
    await supabaseAdmin.from("admin_users").insert({
      user_id: created.data.user.id,
      email: data.email,
      role: "SUPER_ADMIN",
    });
    await supabaseAdmin.from("audit_logs").insert({
      admin_id: created.data.user.id,
      admin_role: "SUPER_ADMIN",
      action: "CHANGE_ADMIN_ROLE",
      target_user_id: created.data.user.id,
      reason: "Initial administrator created via setup code.",
    });
    return { ok: true };
  });

export const staffDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await staffContext(context.userId, "VIEW_USER");
    const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

    const count = async (table: string, build: (q: any) => any = (q) => q) => {
      const { count: total } = await build(
        ctx.db.from(table as never).select("*", { count: "exact", head: true }),
      );
      return total ?? 0;
    };

    const [users, newToday, active, matches, messages, openReports, suspended, banned] =
      await Promise.all([
        count("profiles"),
        count("profiles", (q) => q.gte("created_at", since(1))),
        count("profiles", (q) => q.gte("last_active_at", since(7))),
        count("matches"),
        count("messages"),
        count("reports", (q) => q.in("status", ["NEW", "UNDER_REVIEW", "ESCALATED"])),
        count("profiles", (q) => q.eq("status", "suspended")),
        count("profiles", (q) => q.eq("status", "banned")),
      ]);

    // 14-day series, computed from creation timestamps.
    const [profileRows, matchRows, reportRows, actionRows] = await Promise.all([
      ctx.db.from("profiles").select("created_at").gte("created_at", since(14)),
      ctx.db.from("matches").select("created_at").gte("created_at", since(14)),
      ctx.db.from("reports").select("created_at").gte("created_at", since(14)),
      ctx.db.from("moderation_actions").select("created_at").gte("created_at", since(14)),
    ]);

    const days: string[] = [];
    for (let i = 13; i >= 0; i--) days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    const bucket = (rows: { created_at: string }[] | null) =>
      days.map((day) => rows?.filter((r) => r.created_at.slice(0, 10) === day).length ?? 0);

    return {
      role: ctx.role,
      totals: { users, newToday, active, matches, messages, openReports, suspended, banned },
      series: days.map((day, i) => ({
        day: day.slice(5),
        signups: bucket(profileRows.data)[i]!,
        matches: bucket(matchRows.data)[i]!,
        reports: bucket(reportRows.data)[i]!,
        actions: bucket(actionRows.data)[i]!,
      })),
    };
  });

const PAGE_SIZE = 20;

export const staffListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        query: z.string().max(80).default(""),
        status: z.string().max(20).default("all"),
        page: z.number().int().min(1).max(500).default(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await staffContext(context.userId, "VIEW_USER");
    const from = (data.page - 1) * PAGE_SIZE;

    let q = ctx.db
      .from("profiles")
      .select(
        "id, telegram_id, telegram_username, first_name, city, gender, status, report_count, created_at, last_active_at, is_demo",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (data.status !== "all") q = q.eq("status", data.status as never);
    const term = data.query.trim();
    if (term) {
      const filters = [`first_name.ilike.%${term}%`, `city.ilike.%${term}%`, `telegram_username.ilike.%${term}%`];
      if (/^\d+$/.test(term)) filters.push(`telegram_id.eq.${term}`);
      if (/^[0-9a-f-]{36}$/i.test(term)) filters.push(`id.eq.${term}`);
      q = q.or(filters.join(","));
    }

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, pageSize: PAGE_SIZE, role: ctx.role };
  });

export const staffUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = await staffContext(context.userId, "VIEW_USER");
    const profile = await ctx.db.from("profiles").select("*").eq("id", data.userId).maybeSingle();
    if (!profile.data) throw new Error("That account no longer exists.");

    const countFor = async (table: string, column: string) => {
      const { count } = await ctx.db
        .from(table as never)
        .select("*", { count: "exact", head: true })
        .eq(column, data.userId);
      return count ?? 0;
    };

    const [likes, reportsAgainst, reportsFiled, blocksAgainst, history] = await Promise.all([
      countFor("likes", "liker_id"),
      countFor("reports", "reported_id"),
      countFor("reports", "reporter_id"),
      countFor("blocks", "blocked_id"),
      ctx.db
        .from("moderation_actions")
        .select("id, action, reason, duration_hours, expires_at, created_at")
        .eq("target_user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const { count: matchCount } = await ctx.db
      .from("matches")
      .select("*", { count: "exact", head: true })
      .or(`user_a.eq.${data.userId},user_b.eq.${data.userId}`);
    const { count: messageCount } = await ctx.db
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", data.userId);
    const referrals = await ctx.db
      .from("referrals")
      .select("id")
      .eq("referrer_id", data.userId);

    await audit(ctx, "VIEW_USER", { targetUserId: data.userId });

    const p = profile.data;
    const age = p.date_of_birth
      ? new Date().getUTCFullYear() - Number(p.date_of_birth.slice(0, 4))
      : null;

    return {
      role: ctx.role,
      user: {
        id: p.id,
        telegram_id: p.telegram_id,
        telegram_username: p.telegram_username,
        first_name: p.first_name,
        age,
        city: p.city,
        gender: p.gender,
        bio: p.bio,
        photo_url: p.photo_url,
        interests: p.interests,
        personality: p.personality,
        status: p.status,
        suspended_until: p.suspended_until,
        messaging_disabled: p.messaging_disabled,
        hidden: p.hidden,
        is_demo: p.is_demo,
        created_at: p.created_at,
        last_active_at: p.last_active_at,
        referral_code: p.referral_code,
      },
      stats: {
        likes,
        matches: matchCount ?? 0,
        messages: messageCount ?? 0,
        reportsAgainst,
        reportsFiled,
        blocksAgainst,
        invites: referrals.data?.length ?? 0,
      },
      history: history.data ?? [],
    };
  });

export const staffModerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        action: z.enum(["SUSPEND_USER", "BAN_USER", "UNBAN_USER", "DELETE_PROFILE", "HIDE_PROFILE", "DISABLE_MESSAGING"]),
        reason: z.string().trim().min(5).max(500),
        durationHours: z.number().int().min(1).max(24 * 30).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const permission = (
      data.action === "HIDE_PROFILE" || data.action === "DISABLE_MESSAGING"
        ? "SUSPEND_USER"
        : data.action
    ) as keyof typeof CAN;
    const ctx = await staffContext(context.userId, permission);

    // Staff accounts are never moderation targets from this screen.
    const targetIsStaff = await ctx.db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (targetIsStaff.data) throw new Error("Staff accounts cannot be moderated here.");

    let expires: string | null = null;
    if (data.action === "SUSPEND_USER") {
      const hours = data.durationHours ?? 24;
      expires = new Date(Date.now() + hours * 3600000).toISOString();
      await ctx.db
        .from("profiles")
        .update({ status: "suspended", suspended_until: expires, hidden: true })
        .eq("id", data.userId);
    } else if (data.action === "BAN_USER") {
      await ctx.db
        .from("profiles")
        .update({ status: "banned", hidden: true, messaging_disabled: true })
        .eq("id", data.userId);
    } else if (data.action === "UNBAN_USER") {
      await ctx.db
        .from("profiles")
        .update({
          status: "active",
          suspended_until: null,
          hidden: false,
          messaging_disabled: false,
        })
        .eq("id", data.userId);
    } else if (data.action === "HIDE_PROFILE") {
      await ctx.db.from("profiles").update({ hidden: true }).eq("id", data.userId);
    } else if (data.action === "DISABLE_MESSAGING") {
      await ctx.db.from("profiles").update({ messaging_disabled: true }).eq("id", data.userId);
    } else if (data.action === "DELETE_PROFILE") {
      await ctx.db.from("profiles").update({ status: "deleted", hidden: true }).eq("id", data.userId);
    }

    await ctx.db.from("moderation_actions").insert({
      admin_id: ctx.adminId,
      target_user_id: data.userId,
      action: data.action,
      reason: data.reason,
      duration_hours: data.durationHours ?? null,
      expires_at: expires,
    });
    await audit(ctx, data.action, {
      targetUserId: data.userId,
      reason: data.reason,
      metadata: { durationHours: data.durationHours ?? null },
    });
    return { ok: true };
  });

export const staffListReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.string().max(20).default("open"),
        page: z.number().int().min(1).max(500).default(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await staffContext(context.userId, "VIEW_REPORTS");
    const from = (data.page - 1) * PAGE_SIZE;
    let q = ctx.db
      .from("reports")
      .select("*", { count: "exact" })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (data.status === "open") q = q.in("status", ["NEW", "UNDER_REVIEW", "ESCALATED"]);
    else if (data.status !== "all") q = q.eq("status", data.status as never);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const ids = [
      ...new Set((rows ?? []).flatMap((r) => [r.reporter_id, r.reported_id])),
    ];
    const names = ids.length
      ? await ctx.db.from("profiles").select("id, first_name, status, report_count").in("id", ids)
      : { data: [] };

    return {
      role: ctx.role,
      total: count ?? 0,
      pageSize: PAGE_SIZE,
      rows: (rows ?? []).map((r) => ({
        ...r,
        reporter: names.data?.find((n) => n.id === r.reporter_id) ?? null,
        reported: names.data?.find((n) => n.id === r.reported_id) ?? null,
      })),
    };
  });

export const staffUpdateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        status: z.enum(["UNDER_REVIEW", "RESOLVED", "DISMISSED", "ESCALATED"]),
        note: z.string().trim().max(1000).default(""),
        assignToMe: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await staffContext(context.userId, "RESOLVE_REPORT");
    const report = await ctx.db
      .from("reports")
      .select("id, reported_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report.data) throw new Error("That report no longer exists.");

    await ctx.db
      .from("reports")
      .update({
        status: data.status,
        assigned_to: data.assignToMe ? ctx.adminId : undefined,
        resolved_at:
          data.status === "RESOLVED" || data.status === "DISMISSED"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", data.reportId);

    if (data.note.trim()) {
      await ctx.db
        .from("moderation_notes")
        .insert({ report_id: data.reportId, admin_id: ctx.adminId, note: data.note.trim() });
    }

    await audit(ctx, data.status === "DISMISSED" ? "DISMISS_REPORT" : "RESOLVE_REPORT", {
      targetUserId: report.data.reported_id,
      targetResourceId: data.reportId,
      reason: data.note || data.status,
      metadata: { status: data.status },
    });
    return { ok: true };
  });

/**
 * Case-based conversation review. A moderator can only open the conversation
 * attached to a specific report, must give a reason, and the access is written
 * to conversation_access_log as well as the audit trail.
 */
export const staffReviewReportedConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ reportId: z.string().uuid(), reason: z.string().trim().min(10).max(500) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await staffContext(context.userId, "VIEW_REPORTED_CONVERSATION");
    const report = await ctx.db
      .from("reports")
      .select("id, match_id, reporter_id, reported_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report.data) throw new Error("That report no longer exists.");
    if (!report.data.match_id) {
      throw new Error("This report is not attached to a conversation, so there is nothing to review.");
    }

    await ctx.db.from("conversation_access_log").insert({
      admin_id: ctx.adminId,
      report_id: data.reportId,
      match_id: report.data.match_id,
      reason: data.reason,
    });
    await audit(ctx, "VIEW_REPORTED_CONVERSATION", {
      targetUserId: report.data.reported_id,
      targetResourceId: data.reportId,
      reason: data.reason,
      metadata: { matchId: report.data.match_id },
    });

    const messages = await ctx.db
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("match_id", report.data.match_id)
      .order("created_at", { ascending: true })
      .limit(300);

    return {
      messages: (messages.data ?? []).map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.created_at,
        fromReported: m.sender_id === report.data!.reported_id,
      })),
    };
  });

export const staffSecurityOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await staffContext(context.userId, "VIEW_SECURITY");
    const since = new Date(Date.now() - 7 * 86400000).toISOString();

    const [reports, likes, messages, profiles, blocks] = await Promise.all([
      ctx.db.from("reports").select("reported_id, reporter_id, created_at").gte("created_at", since),
      ctx.db.from("likes").select("liker_id, created_at").gte("created_at", since),
      ctx.db.from("messages").select("sender_id, created_at").gte("created_at", since),
      ctx.db.from("profiles").select("id, first_name, created_at, status").gte("created_at", since),
      ctx.db.from("blocks").select("blocked_id").gte("created_at", since),
    ]);

    const tally = (rows: { [k: string]: unknown }[] | null, key: string) => {
      const map = new Map<string, number>();
      for (const row of rows ?? []) {
        const id = String(row[key]);
        map.set(id, (map.get(id) ?? 0) + 1);
      }
      return map;
    };

    const reported = tally(reports.data, "reported_id");
    const likeCounts = tally(likes.data, "liker_id");
    const messageCounts = tally(messages.data, "sender_id");
    const blockCounts = tally(blocks.data, "blocked_id");
    const reporters = tally(reports.data, "reporter_id");

    const signals: {
      userId: string;
      level: "Normal" | "Needs Review" | "High Risk";
      why: string[];
    }[] = [];
    const ids = new Set<string>([
      ...reported.keys(),
      ...likeCounts.keys(),
      ...messageCounts.keys(),
      ...blockCounts.keys(),
      ...reporters.keys(),
    ]);
    for (const id of ids) {
      const why: string[] = [];
      const r = reported.get(id) ?? 0;
      const b = blockCounts.get(id) ?? 0;
      const l = likeCounts.get(id) ?? 0;
      const m = messageCounts.get(id) ?? 0;
      const filed = reporters.get(id) ?? 0;
      if (r >= 3) why.push(`${r} reports received this week`);
      if (b >= 3) why.push(`${b} blocks received this week`);
      if (l >= 400) why.push(`${l} likes sent this week`);
      if (m >= 600) why.push(`${m} messages sent this week`);
      if (filed >= 8) why.push(`${filed} reports filed this week`);
      if (why.length === 0) continue;
      const level = r >= 5 || b >= 6 ? "High Risk" : "Needs Review";
      signals.push({ userId: id, level, why });
    }
    signals.sort((a, b) => (a.level === "High Risk" ? -1 : b.level === "High Risk" ? 1 : 0));
    const top = signals.slice(0, 30);

    const names = top.length
      ? await ctx.db
          .from("profiles")
          .select("id, first_name, status, report_count")
          .in(
            "id",
            top.map((s) => s.userId),
          )
      : { data: [] };

    return {
      role: ctx.role,
      newAccountsThisWeek: profiles.data?.length ?? 0,
      suspendedOrBanned:
        profiles.data?.filter((p) => p.status === "suspended" || p.status === "banned").length ?? 0,
      reportsThisWeek: reports.data?.length ?? 0,
      signals: top.map((s) => ({
        ...s,
        person: names.data?.find((n) => n.id === s.userId) ?? null,
      })),
    };
  });

export const staffAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ page: z.number().int().min(1).max(500).default(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await staffContext(context.userId, "VIEW_AUDIT");
    const from = (data.page - 1) * PAGE_SIZE;
    const { data: rows, count } = await ctx.db
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    return { rows: rows ?? [], total: count ?? 0, pageSize: PAGE_SIZE };
  });

export const staffListAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await staffContext(context.userId, "CHANGE_ADMIN_ROLE");
    const { data: rows } = await ctx.db
      .from("admin_users")
      .select("user_id, email, role, created_at")
      .order("created_at", { ascending: true });
    return { rows: rows ?? [], me: ctx.adminId };
  });

/**
 * SUPER_ADMIN may add or change MODERATOR / SUPPORT staff only. No admin can
 * mint another SUPER_ADMIN, and nobody can change their own role.
 */
export const staffSetAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email(),
        role: z.enum(["MODERATOR", "SUPPORT", "REMOVE"]),
        password: z.string().min(12).max(200).nullish(),
        reason: z.string().trim().min(5).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await staffContext(context.userId, "CHANGE_ADMIN_ROLE");

    const list = await ctx.db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = list.data?.users.find((u) => u.email === data.email);

    if (!user) {
      if (data.role === "REMOVE") throw new Error("No such staff account.");
      if (!data.password) throw new Error("A first password is required for a new staff account.");
      const created = await ctx.db.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { staff: true },
      });
      if (created.error || !created.data.user) {
        throw new Error(created.error?.message ?? "Could not create that staff account.");
      }
      user = created.data.user;
    }

    if (user.id === ctx.adminId) throw new Error("You cannot change your own role.");

    const current = await ctx.db
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (current.data?.role === "SUPER_ADMIN") {
      throw new Error("A super administrator's role can only be changed directly in the database.");
    }

    if (data.role === "REMOVE") {
      await ctx.db.from("admin_users").delete().eq("user_id", user.id);
    } else {
      await ctx.db.from("admin_users").upsert(
        { user_id: user.id, email: data.email, role: data.role, created_by: ctx.adminId },
        { onConflict: "user_id" },
      );
    }

    await audit(ctx, "CHANGE_ADMIN_ROLE", {
      targetUserId: user.id,
      reason: data.reason,
      metadata: { email: data.email, role: data.role },
    });
    return { ok: true };
  });
