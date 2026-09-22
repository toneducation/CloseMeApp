import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  staffAuditLog,
  staffBootstrap,
  staffDashboard,
  staffListAdmins,
  staffListReports,
  staffListUsers,
  staffMe,
  staffModerate,
  staffNeedsBootstrap,
  staffReviewReportedConversation,
  staffSecurityOverview,
  staffSetAdminRole,
  staffUpdateReport,
  staffUserDetail,
} from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff console — BlindMatch" },
      { name: "description", content: "Internal moderation and safety console for BlindMatch." },
      { property: "og:title", content: "Staff console — BlindMatch" },
      { property: "og:description", content: "Internal moderation and safety console." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffPage,
});

type Role = "SUPER_ADMIN" | "MODERATOR" | "SUPPORT";

const TABS = [
  { key: "dashboard", label: "Overview", roles: ["SUPER_ADMIN", "MODERATOR", "SUPPORT"] },
  { key: "users", label: "Users", roles: ["SUPER_ADMIN", "MODERATOR", "SUPPORT"] },
  { key: "reports", label: "Reports", roles: ["SUPER_ADMIN", "MODERATOR"] },
  { key: "security", label: "Security", roles: ["SUPER_ADMIN", "MODERATOR"] },
  { key: "audit", label: "Audit log", roles: ["SUPER_ADMIN"] },
  { key: "admins", label: "Staff", roles: ["SUPER_ADMIN"] },
] as const;

function StaffPage() {
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      setSignedIn(Boolean(session));
      queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const me = useQuery({
    queryKey: ["staff-me", signedIn],
    queryFn: () => staffMe(),
    enabled: signedIn === true,
    retry: false,
  });

  if (signedIn === undefined || (signedIn && me.isLoading)) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!signedIn || !me.data) return <StaffSignIn signedIn={Boolean(signedIn)} />;

  return <StaffConsole role={me.data.role} email={me.data.email ?? ""} />;
}

function StaffSignIn({ signedIn }: { signedIn: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const bootstrap = useQuery({ queryKey: ["staff-bootstrap"], queryFn: () => staffNeedsBootstrap() });
  const needsBootstrap = bootstrap.data?.needsBootstrap === true;

  const signIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const create = useMutation({
    mutationFn: async () => staffBootstrap({ data: { email, password, code } }),
    onSuccess: async () => {
      toast.success("Administrator created. Signing you in…");
      await supabase.auth.signInWithPassword({ email, password });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <ShieldCheck className="size-8 text-primary" aria-hidden />
      <h1 className="mt-4 font-display text-3xl text-foreground">
        {needsBootstrap ? "Set up the first administrator" : "Staff sign in"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {needsBootstrap
          ? "This one-time setup needs the setup code stored in your project settings."
          : "This console is for BlindMatch staff. All actions are logged."}
      </p>
      {signedIn && !needsBootstrap && (
        <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          You're signed in, but this account has no staff access.
        </p>
      )}

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input
            id="staff-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-password">Password</Label>
          <Input
            id="staff-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
        {needsBootstrap && (
          <div className="space-y-2">
            <Label htmlFor="staff-code">Setup code</Label>
            <Input
              id="staff-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>
        )}
        <Button
          className="h-12 w-full rounded-2xl"
          disabled={signIn.isPending || create.isPending || !email || password.length < 8}
          onClick={() => (needsBootstrap ? create.mutate() : signIn.mutate())}
        >
          {(signIn.isPending || create.isPending) && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          {needsBootstrap ? "Create administrator" : "Sign in"}
        </Button>
        {signedIn && (
          <Button
            variant="outline"
            className="h-11 w-full rounded-2xl"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}

function StaffConsole({ role, email }: { role: Role; email: string }) {
  const tabs = TABS.filter((t) => (t.roles as readonly string[]).includes(role));
  const [tab, setTab] = useState<string>(tabs[0]!.key);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Staff console</h1>
          <p className="text-sm text-muted-foreground">
            {email} · {role.replace("_", " ").toLowerCase()}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 rounded-2xl"
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </Button>
      </header>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Console sections">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-current={tab === t.key ? "page" : undefined}
            onClick={() => setTab(t.key)}
            className={cn(
              "min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium",
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "users" && <UsersTab role={role} />}
        {tab === "reports" && <ReportsTab />}
        {tab === "security" && <SecurityTab />}
        {tab === "audit" && <AuditTab />}
        {tab === "admins" && <AdminsTab />}
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border bg-card p-5", className)}>{children}</div>
  );
}

function DashboardTab() {
  const q = useQuery({ queryKey: ["staff-dashboard"], queryFn: () => staffDashboard() });
  if (q.isLoading) return <Skeleton className="h-72 w-full rounded-3xl" />;
  if (q.isError) return <Card>We couldn't load the overview. Please try again.</Card>;
  const d = q.data!;

  const cards = [
    { label: "Members", value: d.totals.users },
    { label: "New today", value: d.totals.newToday },
    { label: "Active (7d)", value: d.totals.active },
    { label: "Matches", value: d.totals.matches },
    { label: "Messages", value: d.totals.messages },
    { label: "Open reports", value: d.totals.openReports },
    { label: "Suspended", value: d.totals.suspended },
    { label: "Banned", value: d.totals.banned },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-display text-2xl text-card-foreground">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-display text-xl text-card-foreground">Sign-ups and matches (14 days)</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.series}>
              <CartesianGrid strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={28} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="signups"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="matches"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl text-card-foreground">
          Reports and moderation actions (14 days)
        </h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.series}>
              <CartesianGrid strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={28} />
              <Tooltip />
              <Bar dataKey="reports" fill="var(--color-primary)" radius={4} />
              <Bar dataKey="actions" fill="var(--color-accent)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Pager({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <Button
        variant="outline"
        className="h-10 rounded-xl"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <span className="text-muted-foreground">
        Page {page} of {pages} · {total} rows
      </span>
      <Button
        variant="outline"
        className="h-10 rounded-xl"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function UsersTab({ role }: { role: Role }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["staff-users", query, status, page],
    queryFn: () => staffListUsers({ data: { query, status, page } }),
  });

  if (selected) {
    return <UserDetail userId={selected} role={role} onBack={() => setSelected(null)} />;
  }

  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          placeholder="Search name, city, username, Telegram ID or user ID"
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="h-11 min-w-56 flex-1 rounded-2xl"
        />
        {["all", "active", "suspended", "banned"].map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm capitalize",
              status === s ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">City</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Reports</th>
                <th className="py-2 pr-3">Joined</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(list.data?.rows ?? []).map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2.5 pr-3 font-medium">
                    {u.first_name ?? "—"}
                    {u.is_demo && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase">
                        demo
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{u.city ?? "—"}</td>
                  <td className="py-2.5 pr-3 capitalize">{u.status}</td>
                  <td className="py-2.5 pr-3">{u.report_count}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5">
                    <Button
                      variant="outline"
                      className="h-9 rounded-xl"
                      onClick={() => setSelected(u.id)}
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(list.data?.rows ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No members match that.</p>
          )}
        </div>
      )}

      <Pager
        page={page}
        total={list.data?.total ?? 0}
        pageSize={list.data?.pageSize ?? 20}
        onPage={setPage}
      />
    </Card>
  );
}

const SUSPENSIONS = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

function UserDetail({
  userId,
  role,
  onBack,
}: {
  userId: string;
  role: Role;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const detail = useQuery({
    queryKey: ["staff-user", userId],
    queryFn: () => staffUserDetail({ data: { userId } }),
  });

  const act = useMutation({
    mutationFn: async (input: {
      action:
        | "SUSPEND_USER"
        | "BAN_USER"
        | "UNBAN_USER"
        | "DELETE_PROFILE"
        | "HIDE_PROFILE"
        | "DISABLE_MESSAGING";
      durationHours?: number | null;
    }) => staffModerate({ data: { userId, reason, ...input } }),
    onSuccess: () => {
      toast.success("Action recorded.");
      setReason("");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (detail.isLoading) return <Skeleton className="h-96 w-full rounded-3xl" />;
  if (detail.isError) return <Card>That account could not be opened.</Card>;
  const { user, stats, history } = detail.data!;
  const canModerate = role === "SUPER_ADMIN" || role === "MODERATOR";

  return (
    <div className="space-y-5">
      <Button variant="outline" className="h-10 rounded-xl" onClick={onBack}>
        Back to list
      </Button>

      <Card>
        <h2 className="font-display text-2xl text-card-foreground">
          {user.first_name ?? "—"}
          {user.age ? `, ${user.age}` : ""}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {[
            ["City", user.city ?? "—"],
            ["Gender", user.gender ?? "—"],
            ["Status", user.status],
            ["Joined", new Date(user.created_at).toLocaleDateString()],
            [
              "Last active",
              user.last_active_at ? new Date(user.last_active_at).toLocaleString() : "—",
            ],
            ["Suspended until", user.suspended_until ? new Date(user.suspended_until).toLocaleString() : "—"],
            ["User ID", user.id],
            ["Telegram ID", user.telegram_id ? String(user.telegram_id) : "—"],
            ["Username", user.telegram_username ? `@${user.telegram_username}` : "—"],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="break-all">{value as string}</dd>
            </div>
          ))}
        </dl>
        {user.bio && <p className="mt-4 text-sm text-muted-foreground">{user.bio}</p>}
        {(user.interests ?? []).length > 0 && (
          <p className="mt-3 text-sm">Interests: {(user.interests ?? []).join(", ")}</p>
        )}
        {user.personality && Object.keys(user.personality as object).length > 0 && (
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            {Object.entries(user.personality as Record<string, string>).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Likes sent", stats.likes],
          ["Matches", stats.matches],
          ["Messages", stats.messages],
          ["Reports against", stats.reportsAgainst],
          ["Reports filed", stats.reportsFiled],
          ["Blocks against", stats.blocksAgainst],
          ["Invites", stats.invites],
        ].map(([label, value]) => (
          <Card key={label as string} className="p-4">
            <p className="text-xs text-muted-foreground">{label as string}</p>
            <p className="mt-1 font-display text-xl">{value as number}</p>
          </Card>
        ))}
      </div>

      {canModerate && (
        <Card>
          <h3 className="font-display text-xl text-card-foreground">Moderation</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Every action needs a reason and is written to the audit log.
          </p>
          <div className="mt-3 space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What rule was broken, and what evidence did you see?"
              className="min-h-20 rounded-2xl"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUSPENSIONS.map((s) => (
              <Button
                key={s.hours}
                variant="outline"
                className="h-11 rounded-2xl"
                disabled={reason.trim().length < 5 || act.isPending}
                onClick={() => act.mutate({ action: "SUSPEND_USER", durationHours: s.hours })}
              >
                Suspend {s.label}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              disabled={reason.trim().length < 5 || act.isPending}
              onClick={() => act.mutate({ action: "DISABLE_MESSAGING" })}
            >
              Disable messaging
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              disabled={reason.trim().length < 5 || act.isPending}
              onClick={() => act.mutate({ action: "HIDE_PROFILE" })}
            >
              Hide profile
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              disabled={reason.trim().length < 5 || act.isPending}
              onClick={() => act.mutate({ action: "UNBAN_USER" })}
            >
              Restore account
            </Button>
            <Button
              className="h-11 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={reason.trim().length < 5 || act.isPending}
              onClick={() => {
                if (window.confirm("Permanently ban this account? This is a final action.")) {
                  act.mutate({ action: "BAN_USER" });
                }
              }}
            >
              Ban permanently
            </Button>
            {role === "SUPER_ADMIN" && (
              <Button
                variant="outline"
                className="h-11 rounded-2xl text-destructive"
                disabled={reason.trim().length < 5 || act.isPending}
                onClick={() => {
                  if (window.confirm("Delete this profile? Evidence is preserved in the logs.")) {
                    act.mutate({ action: "DELETE_PROFILE" });
                  }
                }}
              >
                Delete profile
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-display text-xl text-card-foreground">Moderation history</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No actions on this account.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="border-t border-border pt-2">
                <span className="font-medium">{h.action.replace(/_/g, " ").toLowerCase()}</span> ·{" "}
                {new Date(h.created_at).toLocaleString()}
                <p className="text-muted-foreground">{h.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ReportsTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [note, setNote] = useState<Record<string, string>>({});
  const [reviewReason, setReviewReason] = useState<Record<string, string>>({});
  const [conversation, setConversation] = useState<
    { reportId: string; messages: { id: string; body: string; createdAt: string; fromReported: boolean }[] } | null
  >(null);

  const list = useQuery({
    queryKey: ["staff-reports", status, page],
    queryFn: () => staffListReports({ data: { status, page } }),
  });

  const update = useMutation({
    mutationFn: async (input: {
      reportId: string;
      status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED" | "ESCALATED";
    }) =>
      staffUpdateReport({
        data: { ...input, note: note[input.reportId] ?? "", assignToMe: true },
      }),
    onSuccess: () => {
      toast.success("Report updated.");
      queryClient.invalidateQueries({ queryKey: ["staff-reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const review = useMutation({
    mutationFn: async (reportId: string) =>
      staffReviewReportedConversation({
        data: { reportId, reason: reviewReason[reportId] ?? "" },
      }),
    onSuccess: (data, reportId) => setConversation({ reportId, messages: data.messages }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["open", "NEW", "UNDER_REVIEW", "ESCALATED", "RESOLVED", "DISMISSED", "all"].map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={cn(
              "min-h-10 rounded-full border px-3 text-xs uppercase tracking-wide",
              status === s ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : (list.data?.rows ?? []).length === 0 ? (
        <Card>Nothing in this queue.</Card>
      ) : (
        (list.data?.rows ?? []).map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {r.category.replace(/_/g, " ")} ·{" "}
                  <span className="text-muted-foreground">priority {r.priority}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.reporter?.first_name ?? "Someone"} reported{" "}
                  {r.reported?.first_name ?? "someone"} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs uppercase">
                {r.status}
              </span>
            </div>
            {r.description && <p className="mt-3 text-sm">{r.description}</p>}
            <p className="mt-2 text-xs text-muted-foreground">Report ID {r.id}</p>

            <Textarea
              value={note[r.id] ?? ""}
              maxLength={1000}
              onChange={(e) => setNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
              placeholder="Moderator note (stored with this case)"
              className="mt-3 min-h-16 rounded-2xl"
              aria-label="Moderator note"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {(["UNDER_REVIEW", "RESOLVED", "DISMISSED", "ESCALATED"] as const).map((s) => (
                <Button
                  key={s}
                  variant={s === "RESOLVED" ? "default" : "outline"}
                  className="h-10 rounded-xl text-xs uppercase"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ reportId: r.id, status: s })}
                >
                  {s.replace("_", " ")}
                </Button>
              ))}
            </div>

            {r.match_id && (
              <div className="mt-4 rounded-2xl bg-secondary/60 p-4">
                <p className="text-sm font-medium">Reported conversation</p>
                <p className="text-xs text-muted-foreground">
                  Opening this is logged with your name, your reason and this report.
                </p>
                <Input
                  value={reviewReason[r.id] ?? ""}
                  onChange={(e) =>
                    setReviewReason((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                  placeholder="Why do you need to read this conversation?"
                  className="mt-2 h-11 rounded-2xl"
                  aria-label="Reason for opening the conversation"
                />
                <Button
                  variant="outline"
                  className="mt-2 h-10 rounded-xl"
                  disabled={(reviewReason[r.id] ?? "").trim().length < 10 || review.isPending}
                  onClick={() => review.mutate(r.id)}
                >
                  Open conversation
                </Button>

                {conversation?.reportId === r.id && (
                  <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm">
                    {conversation.messages.map((m) => (
                      <li
                        key={m.id}
                        className={cn(
                          "rounded-2xl px-3 py-2",
                          m.fromReported ? "bg-destructive/10" : "bg-background",
                        )}
                      >
                        <p className="text-[11px] text-muted-foreground">
                          {m.fromReported ? "Reported member" : "Reporter"} ·{" "}
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                        {m.body}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        ))
      )}

      <Pager
        page={page}
        total={list.data?.total ?? 0}
        pageSize={list.data?.pageSize ?? 20}
        onPage={setPage}
      />
    </div>
  );
}

function SecurityTab() {
  const q = useQuery({ queryKey: ["staff-security"], queryFn: () => staffSecurityOverview() });
  if (q.isLoading) return <Skeleton className="h-64 w-full rounded-3xl" />;
  if (q.isError) return <Card>We couldn't load the security view.</Card>;
  const d = q.data!;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          ["New accounts (7d)", d.newAccountsThisWeek],
          ["Reports (7d)", d.reportsThisWeek],
          ["Suspended or banned", d.suspendedOrBanned],
        ].map(([label, value]) => (
          <Card key={label as string} className="p-4">
            <p className="text-xs text-muted-foreground">{label as string}</p>
            <p className="mt-1 font-display text-2xl">{value as number}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-display text-xl text-card-foreground">Accounts worth a look</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These are workflow states, not accusations. Review the evidence before acting.
        </p>
        {d.signals.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing unusual in the last seven days.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {d.signals.map((s) => (
              <li key={s.userId} className="border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.person?.first_name ?? "Unknown member"}</span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs",
                      s.level === "High Risk"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {s.level}
                  </span>
                </div>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {s.why.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AuditTab() {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["staff-audit", page], queryFn: () => staffAuditLog({ data: { page } }) });
  return (
    <Card>
      <h2 className="font-display text-xl text-card-foreground">Audit log</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Append-only. Nobody, including super administrators, can edit or delete these records.
      </p>
      {q.isLoading ? (
        <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3">Target</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.rows ?? []).map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">{row.admin_role}</td>
                  <td className="py-2 pr-3">{row.action}</td>
                  <td className="py-2 pr-3 break-all text-xs">{row.target_user_id ?? "—"}</td>
                  <td className="py-2">{row.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        page={page}
        total={q.data?.total ?? 0}
        pageSize={q.data?.pageSize ?? 20}
        onPage={setPage}
      />
    </Card>
  );
}

function AdminsTab() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["staff-admins"], queryFn: () => staffListAdmins() });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"MODERATOR" | "SUPPORT">("MODERATOR");
  const [reason, setReason] = useState("");

  const save = useMutation({
    mutationFn: async (nextRole: "MODERATOR" | "SUPPORT" | "REMOVE") =>
      staffSetAdminRole({
        data: { email, role: nextRole, password: password || null, reason },
      }),
    onSuccess: () => {
      toast.success("Staff list updated.");
      setPassword("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["staff-admins"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-display text-xl text-card-foreground">Staff</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(q.data?.rows ?? []).map((row) => (
            <li key={row.user_id} className="flex justify-between border-t border-border pt-2">
              <span>{row.email ?? row.user_id}</span>
              <span className="text-muted-foreground">{row.role}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="font-display text-xl text-card-foreground">Add or change a staff member</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Moderators and support only. Super administrator access can't be granted from here.
        </p>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">First password (new accounts only)</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>
          <div className="flex gap-2">
            {(["MODERATOR", "SUPPORT"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm",
                  role === r ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-reason">Reason</Label>
            <Input
              id="admin-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="h-11 rounded-2xl"
              disabled={!email || reason.trim().length < 5 || save.isPending}
              onClick={() => save.mutate(role)}
            >
              Save role
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              disabled={!email || reason.trim().length < 5 || save.isPending}
              onClick={() => save.mutate("REMOVE")}
            >
              Remove access
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
