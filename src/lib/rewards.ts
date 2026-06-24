// Single source of truth for the Casa Rewards program.
//
// Everything about the visit ladder — how many punches a card holds, which
// visits earn which reward, the labels shown to guests and staff, and the
// "X more visits 'til…" copy — lives here. API routes and UI components all
// import from this module so a program change is a one-file edit, not a hunt
// across a dozen files.
//
// Phase 1 (this file) reproduces the program exactly as it ran before the
// refactor: free dessert at the 5th visit, free entrée at the 10th, then the
// card resets. No behavior change. Later phases edit the config below.

export const CARD_SIZE = 10; // visits per card cycle; card resets after this

export type RewardType =
  | "welcome_chips_queso"
  | "punch_dessert"
  | "punch_entree"
  | "birthday_entree";

// Reward types earned by reaching a visit milestone (i.e. not the welcome
// treat or birthday reward).
export type MilestoneRewardType = Extract<
  RewardType,
  "punch_dessert" | "punch_entree"
>;

export type MilestoneSlug = "dessert" | "entree";

export type Milestone = {
  visit: number; // which visit in the cycle earns it
  type: MilestoneRewardType;
  slug: MilestoneSlug; // used for CSS hooks on the punch dots
  label: string; // canonical short label
  emoji: string;
};

// The visit ladder for one card cycle, ordered by visit number.
export const MILESTONES: Milestone[] = [
  { visit: 5, type: "punch_dessert", slug: "dessert", label: "Free dessert", emoji: "🍰" },
  { visit: CARD_SIZE, type: "punch_entree", slug: "entree", label: "Free entrée", emoji: "🌮" },
];

// Reward type granted at signup.
export const WELCOME_REWARD: RewardType = "welcome_chips_queso";

// Reward earned when a check-in brings the card to `progress`.
// Mirrors the historical rule: the entrée lands at the card size (or beyond,
// defensively), dessert lands on its exact milestone visit.
export function rewardForVisit(progress: number): MilestoneRewardType | null {
  if (progress >= CARD_SIZE) return "punch_entree";
  const m = MILESTONES.find((x) => x.visit === progress);
  return m ? m.type : null;
}

// Progress to store after a check-in: reset to 0 once the card is complete.
export function nextProgress(progress: number): number {
  return progress >= CARD_SIZE ? 0 : progress;
}

// "X more visits 'til a free dessert/entrée" line for the check-in screen.
export function nextRewardLine(progress: number): string {
  if (progress >= CARD_SIZE) return "";
  const next = MILESTONES.find((m) => progress < m.visit);
  if (!next) return "";
  const left = next.visit - progress;
  const treat = next.slug === "dessert" ? "dessert 🍰" : "entrée 🌮";
  return `${left} more visit${left > 1 ? "s" : ""} 'til a free ${treat}`;
}

// Milestone slug for a given dot position (or "" for a plain punch).
export function milestoneSlugAt(n: number): MilestoneSlug | "" {
  const m = MILESTONES.find((x) => x.visit === n);
  return m ? m.slug : "";
}

// Cells for the marketing punch card on /rewards.
export type PunchCell = { n: number; reward?: MilestoneSlug };
export function punchCells(): PunchCell[] {
  return Array.from({ length: CARD_SIZE }, (_, i) => {
    const n = i + 1;
    const slug = milestoneSlugAt(n);
    return slug ? { n, reward: slug } : { n };
  });
}

// Progress values that sit exactly one visit short of a reward (for the
// "one visit from a reward" dashboard list). Today: [4, 9].
export function oneAwayValues(): number[] {
  return MILESTONES.map((m) => m.visit - 1);
}

// Canonical short label, used on guest-facing surfaces and the redeem queue.
export const REWARD_LABELS: Record<RewardType, string> = {
  welcome_chips_queso: "Free chips & queso",
  punch_dessert: "Free dessert",
  punch_entree: "Free entrée",
  birthday_entree: "Birthday entrée",
};
export function rewardLabel(type: string): string {
  return REWARD_LABELS[type as RewardType] ?? type;
}

// Detailed label with milestone context, used on the admin member page.
export const REWARD_LABELS_DETAILED: Record<RewardType, string> = {
  welcome_chips_queso: "Chips & queso (welcome)",
  punch_dessert: `Free dessert (${MILESTONES[0].visit} visits)`,
  punch_entree: `Free entrée (${CARD_SIZE} visits)`,
  birthday_entree: "Birthday entrée",
};
export function rewardLabelDetailed(type: string): string {
  return REWARD_LABELS_DETAILED[type as RewardType] ?? type;
}

// Label of the reward earned at the next visit from `progress` (dashboard).
export function nextRewardLabel(progress: number): string {
  const t = rewardForVisit(progress + 1);
  return t ? rewardLabel(t) : "";
}
