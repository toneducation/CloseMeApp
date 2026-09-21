import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Flame, Gift, Loader2, LogOut, Share2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGate, type MyProfile } from "@/components/AuthGate";
import { Photo } from "@/components/Photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  deleteMyAccount,
  getMyBlocks,
  getMyStats,
  saveMyPreferences,
  unblockUser,
} from "@/lib/profile.functions";
import { getMyMatches } from "@/lib/social.functions";
import { signOut } from "@/lib/session";
import { shareToTelegram } from "@/lib/telegram";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — BlindMatch" },
      {
        name: "description",
        content: "Your BlindMatch profile, who you'd like to meet, invites, safety and settings.",
      },
      { property: "og:title", content: "Your profile — BlindMatch" },
      {
        property: "og:description",
        content: "Your BlindMatch profile, who you'd like to meet, invites, safety and settings.",
      },
    ],
  }),
  component: ProfilePage,
});

const PREFS = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "everyone", label: "Everyone" },
] as const;

function ProfilePage() {
  return <AuthGate>{(profile) => <ProfileInner profile={profile} />}</AuthGate>;
}

function ProfileInner({ profile }: { profile: NonNullable<MyProfile> }) {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ["my-stats"], queryFn: () => getMyStats() });
  const blocks = useQuery({ queryKey: ["my-blocks"], queryFn: () => getMyBlocks() });
  const matches = useQuery({ queryKey: ["matches"], queryFn: () => getMyMatches() });
  const unread = (matches.data ?? []).reduce((total, m) => total + m.unread, 0);

  const [range, setRange] = useState<number[]>([profile.min_age, profile.max_age]);
  const [pref, setPref] = useState<string>(profile.preferred_gender);
  const [filterCity, setFilterCity] = useState(profile.filter_city ?? "");

  const savePrefs = useMutation({
    mutationFn: async () =>
      saveMyPreferences({
        data: {
          min_age: range[0]!,
          max_age: range[1]!,
          preferred_gender: pref as "men",
          filter_city: filterCity.trim() === "" ? null : filterCity.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Filters saved.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async () => deleteMyAccount(),
    onSuccess: async () => {
      await signOut();
      queryClient.clear();
      toast.success("Your account and data have been deleted.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const inviteLink = stats.data?.referralCode
    ? `${typeof window === "undefined" ? "" : window.location.origin}/?ref=${stats.data.referralCode}`
    : null;

  return (
    <AppShell unread={unread}>
      <PageHeader title="Your profile" subtitle="Only your first name, age, city and answers are shared." />

      <section className="mx-5 flex items-center gap-4 rounded-3xl border border-border bg-card p-4">
        <Photo
          path={profile.photo_url}
          name={profile.first_name ?? "You"}
          className="size-20 shrink-0 rounded-2xl"
        />
        <div className="min-w-0">
          <p className="font-display text-2xl leading-none text-card-foreground">
            {profile.first_name}
            {profile.age ? `, ${profile.age}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{profile.city}</p>
          {profile.is_demo && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Demo account
            </p>
          )}
        </div>
      </section>

      <section className="mx-5 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Day streak", value: stats.data?.streak ?? 0, icon: Flame },
          { label: "Matches", value: matches.data?.length ?? 0, icon: ShieldCheck },
          { label: "Invites", value: stats.data?.invites ?? 0, icon: Gift },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-3 text-center">
            <item.icon className="mx-auto size-4 text-primary" aria-hidden />
            <p className="mt-1 font-display text-xl text-card-foreground">{item.value}</p>
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="mx-5 mt-6 space-y-5 rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display text-xl text-card-foreground">Who you'd like to meet</h2>

        <div className="flex flex-wrap gap-2">
          {PREFS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={pref === option.value}
              onClick={() => setPref(option.value)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                pref === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <Label>
            Age range: {range[0]}–{range[1]}
          </Label>
          <Slider
            min={18}
            max={80}
            step={1}
            value={range}
            onValueChange={setRange}
            aria-label="Age range"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-city">Only show people in (optional)</Label>
          <Input
            id="filter-city"
            value={filterCity}
            maxLength={60}
            placeholder="Any city"
            onChange={(e) => setFilterCity(e.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>

        <Button
          className="h-12 w-full rounded-2xl"
          disabled={savePrefs.isPending}
          onClick={() => savePrefs.mutate()}
        >
          {savePrefs.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save filters
        </Button>
      </section>

      <section className="mx-5 mt-4 space-y-3 rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display text-xl text-card-foreground">Invite friends</h2>
        <p className="text-sm text-muted-foreground">
          Share your link. We track who joins through you, ready for rewards later.
        </p>
        {inviteLink && (
          <>
            <p className="break-all rounded-2xl bg-secondary px-4 py-3 text-xs text-secondary-foreground">
              {inviteLink}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-2xl"
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink);
                  toast.success("Link copied.");
                }}
              >
                <Copy className="size-4" aria-hidden /> Copy
              </Button>
              <Button
                className="h-12 flex-1 rounded-2xl"
                onClick={() => shareToTelegram("Come find someone on BlindMatch 💕", inviteLink)}
              >
                <Share2 className="size-4" aria-hidden /> Share
              </Button>
            </div>
          </>
        )}
      </section>

      {(blocks.data ?? []).length > 0 && (
        <section className="mx-5 mt-4 space-y-3 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-xl text-card-foreground">Blocked people</h2>
          <ul className="space-y-2">
            {(blocks.data ?? []).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-card-foreground">{b.first_name}</span>
                <Button
                  variant="ghost"
                  className="h-10 rounded-xl text-sm"
                  onClick={async () => {
                    await unblockUser({ data: { userId: b.id } });
                    toast.success("Unblocked.");
                    queryClient.invalidateQueries();
                  }}
                >
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-5 mt-4 space-y-2 rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display text-xl text-card-foreground">Settings</h2>
        <Link
          to="/legal"
          className="flex min-h-12 items-center text-sm text-card-foreground underline-offset-4 hover:underline"
        >
          Terms, privacy and community guidelines
        </Link>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            queryClient.clear();
          }}
          className="flex min-h-12 w-full items-center gap-2 text-left text-sm text-card-foreground"
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-2 text-left text-sm text-destructive"
            >
              <Trash2 className="size-4" aria-hidden /> Delete my account
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[min(26rem,calc(100vw-2rem))] rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-2xl">
                Delete your account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes your profile, photo, likes, matches and messages. It cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl">Keep my account</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => remove.mutate()}
              >
                Delete everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <p className="mx-5 mt-6 text-xs leading-relaxed text-muted-foreground">
        BlindMatch is for adults aged 18 and over. Compatibility is a light signal based on shared
        interests and answers — it is not a prediction about any relationship.
      </p>
    </AppShell>
  );
}
