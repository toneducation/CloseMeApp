import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { DiscoverDeck } from "@/components/DiscoverDeck";
import { getMyMatches } from "@/lib/social.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlindMatch — meet someone worth talking to" },
      {
        name: "description",
        content:
          "BlindMatch is an 18+ dating Mini App: one thoughtful profile at a time, and chat that only opens on a mutual like.",
      },
      { property: "og:title", content: "BlindMatch — meet someone worth talking to" },
      {
        property: "og:description",
        content:
          "One thoughtful profile at a time. Chat opens only when you both say yes. Strictly 18+.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  return (
    <AuthGate>
      {(profile) => <DiscoverShell>{<DiscoverDeck profile={profile} />}</DiscoverShell>}
    </AuthGate>
  );
}

function DiscoverShell({ children }: { children: React.ReactNode }) {
  const matches = useQuery({ queryKey: ["matches"], queryFn: () => getMyMatches() });
  const unread = (matches.data ?? []).reduce((total, m) => total + m.unread, 0);
  return <AppShell unread={unread}>{children}</AppShell>;
}
