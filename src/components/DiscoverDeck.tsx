import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Heart, MapPin, MoreHorizontal, ShieldAlert, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Photo } from "@/components/Photo";
import { EmptyState, PageHeader } from "@/components/AppShell";
import { MatchCelebration, type MatchResult } from "@/components/MatchCelebration";
import { ReportDialog } from "@/components/ReportDialog";
import { getDiscoverFeed, reactToProfile, type DiscoverCard } from "@/lib/discover.functions";
import { blockPerson } from "@/lib/social.functions";
import { getMyStats } from "@/lib/profile.functions";
import { PERSONALITY_QUESTIONS } from "@/lib/compatibility";
import { haptic } from "@/lib/telegram";
import type { MyProfile } from "@/components/AuthGate";
import { cn } from "@/lib/utils";

export function DiscoverDeck({ profile }: { profile: NonNullable<MyProfile> }) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [reporting, setReporting] = useState(false);

  const feed = useQuery({ queryKey: ["discover"], queryFn: () => getDiscoverFeed() });
  const stats = useQuery({ queryKey: ["my-stats"], queryFn: () => getMyStats() });

  const cards = feed.data ?? [];
  const card = cards[index];

  const react = useMutation({
    mutationFn: async (input: { targetId: string; action: "like" | "pass" }) =>
      reactToProfile({ data: input }),
    onSuccess: (result) => {
      if (result.matched) {
        haptic("heavy");
        setMatch({
          matchId: result.matchId,
          compatibility: result.compatibility,
          them: result.them,
        });
        queryClient.invalidateQueries({ queryKey: ["matches"] });
      }
      queryClient.invalidateQueries({ queryKey: ["my-stats"] });
      setIndex((i) => i + 1);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const block = useMutation({
    mutationFn: async (userId: string) => blockPerson({ data: { userId } }),
    onSuccess: () => {
      toast.success("Blocked. You won't see each other again.");
      setIndex((i) => i + 1);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (feed.data && index >= feed.data.length && feed.data.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["discover"] });
      setIndex(0);
    }
  }, [feed.data, index, queryClient]);

  if (feed.isLoading) {
    return (
      <div className="space-y-4 px-5 pt-6">
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-[460px] w-full rounded-3xl" />
        <div className="flex gap-3">
          <Skeleton className="h-16 flex-1 rounded-2xl" />
          <Skeleton className="h-16 flex-1 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (feed.isError) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-6" aria-hidden />}
        title="We couldn't load people right now"
        body="Something went wrong on our side. Please try again in a moment."
        action={
          <Button className="rounded-2xl" onClick={() => feed.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Discover"
        subtitle={
          profile.is_demo
            ? "Demo mode — these are sample people, not real members."
            : "One person at a time. Take your time."
        }
        right={
          <span className="mt-1 flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
            <Flame className="size-3.5 text-primary" aria-hidden />
            {stats.data?.streak ?? 0} day streak
          </span>
        }
      />

      {!card ? (
        <EmptyState
          title="That's everyone for now"
          body="You've seen every profile that matches your filters. Widen your age range or city in Profile, and check back soon."
        />
      ) : (
        <div className="px-5">
          <SwipeCard
            key={card.id}
            card={card}
            busy={react.isPending}
            onDecide={(action) => {
              haptic("light");
              react.mutate({ targetId: card.id, action });
            }}
            onReport={() => setReporting(true)}
            onBlock={() => block.mutate(card.id)}
          />

          <div className="mt-5 flex gap-3">
            <Button
              variant="outline"
              className="h-16 flex-1 rounded-2xl text-base"
              disabled={react.isPending}
              onClick={() => {
                haptic("light");
                react.mutate({ targetId: card.id, action: "pass" });
              }}
            >
              <X className="size-5" aria-hidden /> Pass
            </Button>
            <Button
              className="h-16 flex-1 rounded-2xl text-base"
              disabled={react.isPending}
              onClick={() => {
                haptic("medium");
                react.mutate({ targetId: card.id, action: "like" });
              }}
            >
              <Heart className="size-5" aria-hidden /> Like
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Swipe the card left or right if you prefer.
          </p>
        </div>
      )}

      {card && (
        <ReportDialog
          open={reporting}
          onOpenChange={setReporting}
          userId={card.id}
          name={card.first_name}
          onDone={() => setIndex((i) => i + 1)}
        />
      )}

      {match && (
        <MatchCelebration
          match={match}
          myPhoto={profile.photo_url}
          myName={profile.first_name ?? "You"}
          referralCode={stats.data?.referralCode ?? null}
          onClose={() => setMatch(null)}
        />
      )}
    </>
  );
}

function SwipeCard({
  card,
  busy,
  onDecide,
  onReport,
  onBlock,
}: {
  card: DiscoverCard;
  busy: boolean;
  onDecide: (action: "like" | "pass") => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<"like" | "pass" | null>(null);
  const start = useRef<number | null>(null);

  const answers = useMemo(
    () =>
      PERSONALITY_QUESTIONS.filter((q) => (card.personality?.[q.key] ?? "").trim().length > 0).slice(
        0,
        3,
      ),
    [card.personality],
  );

  const commit = (action: "like" | "pass") => {
    if (busy) return;
    setLeaving(action);
    setTimeout(() => onDecide(action), 160);
  };

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm animate-card-in touch-pan-y",
        leaving && "pointer-events-none opacity-0",
      )}
      style={{
        transform: leaving
          ? `translateX(${leaving === "like" ? 120 : -120}%) rotate(${leaving === "like" ? 12 : -12}deg)`
          : `translateX(${dx}px) rotate(${dx / 28}deg)`,
        transition: dx === 0 || leaving ? "transform 200ms ease, opacity 200ms ease" : "none",
      }}
      onPointerDown={(e) => {
        start.current = e.clientX;
      }}
      onPointerMove={(e) => {
        if (start.current === null) return;
        setDx(e.clientX - start.current);
      }}
      onPointerUp={() => {
        if (Math.abs(dx) > 110) commit(dx > 0 ? "like" : "pass");
        start.current = null;
        setDx(0);
      }}
      onPointerCancel={() => {
        start.current = null;
        setDx(0);
      }}
    >
      <div className="relative">
        <Photo path={card.photo_url} name={card.first_name} className="h-[380px] w-full" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5 pt-16">
          <div className="flex items-end justify-between gap-3">
            <div className="text-white">
              <h2 className="font-display text-3xl leading-none">
                {card.first_name}, {card.age}
              </h2>
              {card.city && (
                <p className="mt-2 flex items-center gap-1.5 text-sm opacity-90">
                  <MapPin className="size-3.5" aria-hidden /> {card.city}
                </p>
              )}
            </div>
            <span className="flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden /> {card.compatibility}%
            </span>
          </div>
        </div>
        {dx !== 0 && (
          <span
            className={cn(
              "absolute left-5 top-5 rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white",
              dx > 0 ? "bg-primary" : "bg-foreground/80",
            )}
          >
            {dx > 0 ? "Like" : "Pass"}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More options for ${card.first_name}`}
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
          >
            <MoreHorizontal className="size-5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={onReport}>Report {card.first_name}</DropdownMenuItem>
            <DropdownMenuItem onClick={onBlock}>Block {card.first_name}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Compatibility {card.compatibility}% · a light signal, not a promise
        </p>
        {card.bio && <p className="text-sm leading-relaxed text-card-foreground">{card.bio}</p>}
        {card.interests.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {card.interests.map((interest) => (
              <li
                key={interest}
                className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
              >
                {interest}
              </li>
            ))}
          </ul>
        )}
        {answers.length > 0 && (
          <dl className="space-y-3 border-t border-border pt-4">
            {answers.map((q) => (
              <div key={q.key}>
                <dt className="text-xs font-semibold text-muted-foreground">{q.label}</dt>
                <dd className="mt-0.5 text-sm text-card-foreground">{card.personality[q.key]}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}
