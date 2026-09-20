import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Sparkles } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Photo } from "@/components/Photo";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getMyMatches } from "@/lib/social.functions";
import { getDailyMatches } from "@/lib/discover.functions";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Your matches — BlindMatch" },
      {
        name: "description",
        content: "Everyone who liked you back, your daily picks, and your open conversations.",
      },
      { property: "og:title", content: "Your matches — BlindMatch" },
      {
        property: "og:description",
        content: "Everyone who liked you back, your daily picks, and your open conversations.",
      },
    ],
  }),
  component: MatchesPage,
});

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function MatchesPage() {
  return <AuthGate>{() => <MatchesInner />}</AuthGate>;
}

function MatchesInner() {
  const matches = useQuery({ queryKey: ["matches"], queryFn: () => getMyMatches() });
  const daily = useQuery({ queryKey: ["daily"], queryFn: () => getDailyMatches() });
  const unread = (matches.data ?? []).reduce((total, m) => total + m.unread, 0);

  return (
    <AppShell unread={unread}>
      <PageHeader title="Matches" subtitle="Chat opens only when you both said yes." />

      {daily.data && daily.data.length > 0 && (
        <section className="px-5 pb-6" aria-labelledby="daily-heading">
          <h2
            id="daily-heading"
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Today's three picks
          </h2>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {daily.data.map((person) => (
              <li key={person.id} className="w-32 shrink-0">
                <Photo
                  path={person.photo_url}
                  name={person.first_name}
                  className="h-40 w-32 rounded-2xl"
                />
                <p className="mt-2 truncate text-sm font-semibold text-foreground">
                  {person.first_name}, {person.age}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="size-3 text-primary" aria-hidden /> {person.compatibility}%
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {matches.isLoading ? (
        <ul className="space-y-3 px-5">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-20 w-full rounded-3xl" />
            </li>
          ))}
        </ul>
      ) : (matches.data ?? []).length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="size-6" aria-hidden />}
          title="No matches yet"
          body="When someone you liked likes you back, they'll appear here and the chat opens."
          action={
            <Button asChild className="rounded-2xl">
              <Link to="/">Back to Discover</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3 px-5">
          {(matches.data ?? []).map((m) => (
            <li key={m.matchId}>
              <Link
                to="/chat/$matchId"
                params={{ matchId: m.matchId }}
                className="flex items-center gap-4 rounded-3xl border border-border bg-card p-3 transition-colors hover:border-primary/50"
              >
                <Photo
                  path={m.person!.photo_url}
                  name={m.person!.first_name}
                  className="size-16 shrink-0 rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-card-foreground">
                      {m.person!.first_name}, {m.person!.age}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(m.lastMessageAt ?? m.createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {m.lastMessage ?? "Say hello — no message yet."}
                  </p>
                </div>
                {m.unread > 0 && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {m.unread > 9 ? "9+" : m.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
