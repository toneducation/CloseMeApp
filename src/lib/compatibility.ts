/**
 * Transparent, deliberately simple compatibility score.
 * Shared interests 40% · same city 20% · age-preference fit 20% ·
 * personality answer similarity 20%. This is a fun discovery signal only —
 * it does not predict romantic outcomes.
 */

export const PERSONALITY_QUESTIONS: { key: string; label: string; placeholder: string }[] = [
  {
    key: "talk_hours",
    label: "What could you talk about for hours?",
    placeholder: "Old films, city maps, football tactics…",
  },
  {
    key: "perfect_weekend",
    label: "What is your perfect weekend?",
    placeholder: "Long walk, good coffee, no plans",
  },
  {
    key: "evening",
    label: "Night out or quiet evening?",
    placeholder: "Quiet evening, mostly",
  },
  {
    key: "people",
    label: "What kind of people do you enjoy being around?",
    placeholder: "Curious, warm, a bit funny",
  },
  {
    key: "three_words",
    label: "Describe yourself in three words.",
    placeholder: "Calm, curious, stubborn",
  },
  {
    key: "this_year",
    label: "What is something you want to experience this year?",
    placeholder: "See the sea in winter",
  },
  {
    key: "instant_like",
    label: "What makes you instantly like someone?",
    placeholder: "When they ask a second question",
  },
];

export interface ScoreInput {
  interests: string[];
  city: string | null;
  age: number;
  minAge: number;
  maxAge: number;
  personality: Record<string, unknown>;
}

function tokens(value: unknown): Set<string> {
  if (typeof value !== "string") return new Set();
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

function personalitySimilarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
  let scored = 0;
  let total = 0;
  for (const question of PERSONALITY_QUESTIONS) {
    const left = tokens(a[question.key]);
    const right = tokens(b[question.key]);
    if (left.size === 0 || right.size === 0) continue;
    total += 1;
    let shared = 0;
    for (const word of left) if (right.has(word)) shared += 1;
    scored += Math.min(1, shared / 2);
  }
  return total === 0 ? 0.35 : scored / total;
}

export function compatibilityScore(me: ScoreInput, them: ScoreInput): number {
  const mine = new Set(me.interests.map((i) => i.toLowerCase()));
  const theirs = them.interests.map((i) => i.toLowerCase());
  const shared = theirs.filter((i) => mine.has(i)).length;
  const denominator = Math.max(1, Math.min(mine.size, theirs.length, 5));
  const interestScore = Math.min(1, shared / denominator);

  const cityScore =
    me.city && them.city && me.city.trim().toLowerCase() === them.city.trim().toLowerCase() ? 1 : 0;

  const inMyRange = them.age >= me.minAge && them.age <= me.maxAge ? 0.5 : 0;
  const inTheirRange = me.age >= them.minAge && me.age <= them.maxAge ? 0.5 : 0;
  const ageScore = inMyRange + inTheirRange;

  const personaScore = personalitySimilarity(me.personality, them.personality);

  const raw = interestScore * 40 + cityScore * 20 + ageScore * 20 + personaScore * 20;
  return Math.max(12, Math.min(99, Math.round(raw)));
}

export function sharedInterests(a: string[], b: string[]): string[] {
  const set = new Set(b.map((i) => i.toLowerCase()));
  return a.filter((i) => set.has(i.toLowerCase()));
}

/** Three icebreakers built from what the two people actually have in common. */
export function icebreakers(
  theirName: string,
  myInterests: string[],
  theirInterests: string[],
  theirPersonality: Record<string, unknown>,
): string[] {
  const common = sharedInterests(myInterests, theirInterests);
  const out: string[] = [];

  if (common[0]) {
    out.push(`We both like ${common[0].toLowerCase()}. What got you into it?`);
  }
  if (common[1]) {
    out.push(`Since we both picked ${common[1].toLowerCase()} — what's your latest favourite?`);
  }
  const talk = theirPersonality["talk_hours"];
  if (typeof talk === "string" && talk.trim()) {
    out.push(`You said you could talk for hours about ${talk.trim().toLowerCase()}. Convince me.`);
  }
  const weekend = theirPersonality["perfect_weekend"];
  if (typeof weekend === "string" && weekend.trim()) {
    out.push(`Your perfect weekend sounds good. Is that how this one is going?`);
  }

  const fallbacks = [
    `Hi ${theirName} — what made you open BlindMatch today?`,
    `Tell me one small thing that made you smile this week.`,
    `If tomorrow were free, where would you go?`,
  ];
  for (const f of fallbacks) {
    if (out.length >= 3) break;
    out.push(f);
  }
  return out.slice(0, 3);
}
