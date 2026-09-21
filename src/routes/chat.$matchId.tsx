import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreHorizontal, Send } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { Photo } from "@/components/Photo";
import { ReportDialog } from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { blockPerson, getConversation, sendMessage } from "@/lib/social.functions";

export const Route = createFileRoute("/chat/$matchId")({
  head: () => ({
    meta: [
      { title: "Chat — BlindMatch" },
      { name: "description", content: "A private conversation between two people who matched." },
      { property: "og:title", content: "Chat — BlindMatch" },
      {
        property: "og:description",
        content: "A private conversation between two people who matched.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return <AuthGate>{() => <ChatInner />}</AuthGate>;
}

function ChatInner() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [reporting, setReporting] = useState(false);
  const bottom = useRef<HTMLDivElement | null>(null);

  const conversation = useQuery({
    queryKey: ["conversation", matchId],
    queryFn: () => getConversation({ data: { matchId } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversation", matchId] });
          queryClient.invalidateQueries({ queryKey: ["matches"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.data?.messages.length]);

  const send = useMutation({
    mutationFn: async (body: string) => sendMessage({ data: { matchId, body } }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["conversation", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const block = useMutation({
    mutationFn: async (userId: string) => blockPerson({ data: { userId } }),
    onSuccess: () => {
      toast.success("Blocked. This conversation is closed.");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      navigate({ to: "/matches" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (conversation.isLoading) {
    return (
      <div className="mx-auto w-full max-w-md space-y-3 p-5">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-24 w-3/4 rounded-2xl" />
        <Skeleton className="h-24 w-3/4 self-end rounded-2xl" />
      </div>
    );
  }

  if (conversation.isError || !conversation.data?.person) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          This conversation isn't available. It may have been closed after a block or report.
        </p>
        <Button asChild className="rounded-2xl">
          <Link to="/matches">Back to matches</Link>
        </Button>
      </div>
    );
  }

  const person = conversation.data.person;
  const messages = conversation.data.messages;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          to="/matches"
          aria-label="Back to matches"
          className="flex size-10 items-center justify-center rounded-full hover:bg-secondary"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Photo path={person.photo_url} name={person.first_name} className="size-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight text-foreground">
            {person.first_name}, {person.age}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.data.compatibility}% compatibility
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More options for ${person.first_name}`}
            className="flex size-10 items-center justify-center rounded-full hover:bg-secondary"
          >
            <MoreHorizontal className="size-5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={() => setReporting(true)}>Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => block.mutate(person.id)}>
              Block and close chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 space-y-3 px-4 py-5">
        {messages.length === 0 && (
          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="font-display text-xl text-card-foreground">
              You matched with {person.first_name}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Not sure how to start? Tap one of these.
            </p>
            <ul className="mt-4 space-y-2">
              {conversation.data.icebreakers.map((line) => (
                <li key={line}>
                  <button
                    type="button"
                    onClick={() => setDraft(line)}
                    className="w-full rounded-2xl bg-secondary px-4 py-3 text-left text-sm text-secondary-foreground transition-colors hover:bg-secondary/70"
                  >
                    {line}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}
          >
            <p
              className={`max-w-[80%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-sm ${
                m.mine
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {m.body}
            </p>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {m.mine && m.readAt ? " · Read" : ""}
            </span>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form
        className="safe-bottom sticky bottom-0 flex gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (body) send.mutate(body);
        }}
      >
        <label className="sr-only" htmlFor="message">
          Message {person.first_name}
        </label>
        <Input
          id="message"
          value={draft}
          maxLength={2000}
          disabled={!conversation.data.canSend}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            conversation.data.canSend ? "Write a message…" : "Messaging is paused on your account"
          }
          className="h-12 rounded-2xl"
        />
        <Button
          type="submit"
          aria-label="Send message"
          className="size-12 shrink-0 rounded-2xl"
          disabled={!draft.trim() || send.isPending || !conversation.data.canSend}
        >
          <Send className="size-5" aria-hidden />
        </Button>
      </form>

      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        userId={person.id}
        name={person.first_name}
        matchId={matchId}
        onDone={() => navigate({ to: "/matches" })}
      />
    </div>
  );
}
