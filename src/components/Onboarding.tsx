import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { PERSONALITY_QUESTIONS } from "@/lib/compatibility";
import { uploadProfilePhoto } from "@/lib/photos";
import { saveMyProfile } from "@/lib/profile.functions";
import { Photo } from "@/components/Photo";
import { cn } from "@/lib/utils";

const GENDERS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "unspecified", label: "Prefer not to say" },
] as const;

const PREFS = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "everyone", label: "Everyone" },
] as const;

const FALLBACK_INTERESTS = [
  "Music",
  "Films",
  "Books",
  "Travel",
  "Cooking",
  "Coffee",
  "Fitness",
  "Football",
  "Art",
  "Photography",
  "Gaming",
  "Nature",
  "Dancing",
  "Technology",
  "Volunteering",
];

function ageFrom(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const birth = new Date(dob + "T00:00:00Z");
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

export function Onboarding({ userId, initialName }: { userId: string; initialName: string | null }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [dob, setDob] = useState("");
  const [firstName, setFirstName] = useState(initialName ?? "");
  const [gender, setGender] = useState<string>("");
  const [pref, setPref] = useState<string>("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const interestsQuery = useQuery({
    queryKey: ["interests"],
    queryFn: async () => {
      const { data } = await supabase.from("interests").select("name").order("name");
      const names = (data ?? []).map((i) => i.name as string);
      return names.length > 0 ? names : FALLBACK_INTERESTS;
    },
  });

  const age = ageFrom(dob);

  const save = useMutation({
    mutationFn: async () =>
      saveMyProfile({
        data: {
          first_name: firstName.trim(),
          date_of_birth: dob,
          gender: gender as "man",
          preferred_gender: pref as "men",
          city: city.trim(),
          bio: bio.trim(),
          photo_url: photo,
          interests: chosen,
          personality: answers,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Your profile is live.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const steps = useMemo(
    () => [
      {
        title: "First, your date of birth",
        subtitle: "BlindMatch is strictly for people aged 18 and over. We only ever show your age.",
        valid: age !== null && age >= 18 && age <= 100,
        content: (
          <div className="space-y-3">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={dob}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDob(e.target.value)}
              className="h-12 rounded-2xl"
            />
            {dob && age !== null && (
              <p className={cn("text-sm", age >= 18 ? "text-muted-foreground" : "text-destructive")}>
                {age >= 18
                  ? `You are ${age}. Only your age will be visible to others.`
                  : "You must be 18 or older to use BlindMatch."}
              </p>
            )}
          </div>
        ),
      },
      {
        title: "About you",
        subtitle: "Your first name is what people see. No surnames, no phone numbers.",
        valid: firstName.trim().length >= 2 && gender !== "" && pref !== "",
        content: (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={firstName}
                maxLength={40}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Lena"
                className="h-12 rounded-2xl"
              />
            </div>
            <ChipGroup
              label="I am"
              options={GENDERS}
              value={gender}
              onChange={setGender}
            />
            <ChipGroup label="I'd like to meet" options={PREFS} value={pref} onChange={setPref} />
          </div>
        ),
      },
      {
        title: "Your photo and city",
        subtitle: "A clear photo of your face works best. You can change it any time.",
        valid: city.trim().length >= 2 && Boolean(photo),
        content: (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Photo
                path={photo}
                name={firstName || "You"}
                className="size-24 shrink-0 rounded-3xl"
              />
              <div className="space-y-2">
                <label
                  htmlFor="photo"
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-medium"
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Camera className="size-4" aria-hidden />
                  )}
                  {photo ? "Change photo" : "Upload photo"}
                </label>
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      setPhoto(await uploadProfilePhoto(file, userId));
                    } catch (error) {
                      toast.error((error as Error).message);
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">JPG or PNG, up to 12 MB.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                maxLength={60}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Berlin"
                className="h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Short bio (optional)</Label>
              <Textarea
                id="bio"
                value={bio}
                maxLength={400}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Two sentences about what you're like."
                className="min-h-24 rounded-2xl"
              />
            </div>
          </div>
        ),
      },
      {
        title: "What are you into?",
        subtitle: "Pick up to 8. Shared interests shape who you see.",
        valid: chosen.length >= 1,
        content: (
          <div className="flex flex-wrap gap-2">
            {(interestsQuery.data ?? FALLBACK_INTERESTS).map((name) => {
              const active = chosen.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setChosen((prev) =>
                      prev.includes(name)
                        ? prev.filter((x) => x !== name)
                        : prev.length >= 8
                          ? prev
                          : [...prev, name],
                    )
                  }
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-card-foreground hover:border-primary/50",
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        ),
      },
      {
        title: "A few honest answers",
        subtitle: "These appear on your profile and make much better conversations.",
        valid: Object.values(answers).filter((a) => a.trim().length > 0).length >= 3,
        content: (
          <div className="space-y-4">
            {PERSONALITY_QUESTIONS.map((q) => (
              <div key={q.key} className="space-y-2">
                <Label htmlFor={q.key}>{q.label}</Label>
                <Input
                  id={q.key}
                  value={answers[q.key] ?? ""}
                  maxLength={300}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="h-12 rounded-2xl"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Answer at least three to continue.</p>
          </div>
        ),
      },
    ],
    [age, answers, bio, chosen, city, dob, firstName, gender, interestsQuery.data, photo, pref, uploading, userId],
  );

  const current = steps[step]!;
  const last = step === steps.length - 1;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
      <div className="flex items-center gap-2" aria-hidden>
        {steps.map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index <= step ? "bg-primary" : "bg-secondary",
            )}
          />
        ))}
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Step {step + 1} of {steps.length}
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-foreground">{current.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{current.subtitle}</p>

      <div className="mt-7 flex-1 animate-card-in">{current.content}</div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl"
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
        )}
        <Button
          type="button"
          className="h-12 flex-1 rounded-2xl"
          disabled={!current.valid || save.isPending}
          onClick={() => (last ? save.mutate() : setStep((s) => s + 1))}
        >
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : last ? (
            <>
              Start matching <Check className="size-4" aria-hidden />
            </>
          ) : (
            <>
              Continue <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
              value === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-card-foreground hover:border-primary/50",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
