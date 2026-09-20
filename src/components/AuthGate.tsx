import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/profile.functions";
import { canUseTelegram, signInAsDemo, signInWithTelegram } from "@/lib/session";
import { getTelegramUser, initTelegram } from "@/lib/telegram";
import { Onboarding } from "@/components/Onboarding";

export type MyProfile = Awaited<ReturnType<typeof getMyProfile>>;

export function AuthGate({ children }: { children: (profile: NonNullable<MyProfile>) => ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionUserId, setSessionUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    initTelegram();
    supabase.auth.getSession().then(({ data }) => setSessionUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSessionUserId(session?.user.id ?? null);
      if (event === "SIGNED_OUT") queryClient.clear();
      else queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const profileQuery = useQuery({
    queryKey: ["my-profile", sessionUserId],
    queryFn: () => getMyProfile(),
    enabled: Boolean(sessionUserId),
  });

  if (sessionUserId === undefined || (sessionUserId && profileQuery.isLoading)) {
    return <BootSkeleton />;
  }

  if (!sessionUserId) return <Welcome />;

  const profile = profileQuery.data;
  if (!profile) return <BootSkeleton />;

  if (profile.status === "banned") {
    return (
      <Blocked
        title="Your account has been closed"
        body="This account was closed for breaking our community guidelines. If you believe this is a mistake, reply to the bot and our team will look into it."
      />
    );
  }
  if (profile.status === "suspended") {
    return (
      <Blocked
        title="Your account is paused"
        body="Your account is temporarily paused while our team reviews a report. You'll be able to continue once the review is finished."
      />
    );
  }

  if (!profile.is_complete) {
    return <Onboarding userId={profile.id} initialName={profile.first_name} />;
  }

  return <>{children(profile)}</>;
}

function BootSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-5 pt-10">
      <Skeleton className="h-8 w-40 rounded-xl" />
      <Skeleton className="h-[460px] w-full rounded-3xl" />
      <div className="flex gap-3">
        <Skeleton className="h-14 flex-1 rounded-2xl" />
        <Skeleton className="h-14 flex-1 rounded-2xl" />
      </div>
    </div>
  );
}

function Blocked({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <ShieldCheck className="size-10 text-primary" aria-hidden />
      <h1 className="mt-4 font-display text-2xl text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Welcome() {
  const inTelegram = canUseTelegram();
  const tgUser = getTelegramUser();

  const signIn = useMutation({
    mutationFn: async () => (inTelegram ? signInWithTelegram() : signInAsDemo()),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-6 pb-10 pt-16">
      <div>
        <div className="flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
          <Heart className="size-7" aria-hidden />
        </div>
        <h1 className="mt-7 font-display text-5xl leading-[1.05] tracking-tight text-foreground">
          Meet someone
          <br />
          worth talking to.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          BlindMatch shows you one person at a time, with real answers instead of endless swiping.
          Chat only opens when you both say yes.
        </p>

        <ul className="mt-8 space-y-3 text-sm">
          {[
            "One thoughtful profile at a time",
            "Chat unlocks only on a mutual like",
            "Strictly 18+, with reporting and blocking built in",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <Button
          className="h-14 w-full rounded-2xl text-base"
          disabled={signIn.isPending}
          onClick={() => signIn.mutate()}
        >
          {signIn.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {inTelegram
            ? `Continue${tgUser?.first_name ? ` as ${tgUser.first_name}` : " with Telegram"}`
            : "Try the demo"}
        </Button>
        {!inTelegram && (
          <p className="text-center text-xs text-muted-foreground">
            You're outside Telegram, so this opens a clearly marked demo account with sample people.
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          By continuing you confirm you are 18 or older and accept our{" "}
          <a className="underline" href="/legal">
            terms and privacy policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
