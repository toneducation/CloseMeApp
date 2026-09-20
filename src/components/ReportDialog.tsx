import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { reportPerson } from "@/lib/social.functions";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "spam", label: "Spam" },
  { value: "fake_profile", label: "Fake profile" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "underage", label: "Appears under 18" },
  { value: "scam", label: "Scam or money request" },
  { value: "threat", label: "Threat or violence" },
  { value: "other", label: "Something else" },
] as const;

export function ReportDialog({
  open,
  onOpenChange,
  userId,
  name,
  matchId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  name: string;
  matchId?: string | null;
  onDone?: () => void;
}) {
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);

  const submit = useMutation({
    mutationFn: async () =>
      reportPerson({
        data: {
          userId,
          category: category as "spam",
          description,
          matchId: matchId ?? null,
          alsoBlock,
        },
      }),
    onSuccess: () => {
      toast.success("Thank you. Our moderators will review this.");
      onOpenChange(false);
      setCategory("");
      setDescription("");
      onDone?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(26rem,calc(100vw-2rem))] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Report {name}</DialogTitle>
          <DialogDescription>
            Reports are private. Our moderation team reviews each one and {name} is never told who
            reported them.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What happened?</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={category === c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "min-h-10 rounded-full border px-3 text-sm transition-colors",
                  category === c.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="report-details">Details (optional)</Label>
          <Textarea
            id="report-details"
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Anything that helps our team understand."
            className="min-h-24 rounded-2xl"
          />
        </div>

        <label className="flex items-center gap-3 text-sm">
          <Checkbox
            checked={alsoBlock}
            onCheckedChange={(value) => setAlsoBlock(value === true)}
            aria-label={`Also block ${name}`}
          />
          Also block {name} so you never see them again
        </label>

        <DialogFooter>
          <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-2xl"
            disabled={!category || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
