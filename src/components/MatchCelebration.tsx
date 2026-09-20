import { Link } from "@tanstack/react-router";
import { Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Photo } from "@/components/Photo";
import { shareToTelegram } from "@/lib/telegram";

export interface MatchResult {
  matchId: string | null;
  compatibility: number;
  them: { id: string; first_name: string; photo_url: string | null } | null;
}

export function MatchCelebration({
  match,
  myPhoto,
  myName,
  referralCode,
  onClose,
}: {
  match: MatchResult;
  myPhoto: string | null;
  myName: string;
  referralCode: string | null;
  onClose: () => void;
}) {
  const them = match.them;
  if (!them) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="It's a match"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-accent px-6 text-center text-accent-foreground"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex size-11 items-center justify-center rounded-full bg-accent-foreground/10"
      >
        <X className="size-5" aria-hidden />
      </button>

      <div className="flex items-center justify-center -space-x-6">
        <Photo
          path={myPhoto}
          name={myName}
          className="size-28 rounded-full border-4 border-accent animate-float"
        />
        <Photo
          path={them.photo_url}
          name={them.first_name}
          className="size-28 rounded-full border-4 border-accent animate-float"
        />
      </div>

      <h1 className="mt-8 font-display text-4xl leading-tight animate-pop">IT'S A MATCH! 💕</h1>
      <p className="mt-3 max-w-xs text-sm opacity-90">
        You and {them.first_name} both said yes. Compatibility {match.compatibility}% — say hello
        while the moment is warm.
      </p>

      <div className="mt-8 w-full max-w-xs space-y-3">
        {match.matchId && (
          <Button asChild className="h-14 w-full rounded-2xl text-base">
            <Link to="/chat/$matchId" params={{ matchId: match.matchId }}>
              Send the first message
            </Link>
          </Button>
        )}
        <Button
          variant="outline"
          className="h-12 w-full rounded-2xl border-accent-foreground/30 bg-transparent"
          onClick={() =>
            shareToTelegram(
              `I just matched with someone on BlindMatch 💕`,
              referralCode
                ? `${window.location.origin}/?ref=${referralCode}`
                : window.location.origin,
            )
          }
        >
          <Share2 className="size-4" aria-hidden /> Share the moment
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 w-full text-sm underline opacity-80"
        >
          Keep discovering
        </button>
      </div>
    </div>
  );
}
