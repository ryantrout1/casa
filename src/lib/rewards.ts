// Single source of truth for the Casa Rewards program.
//
// Everything about the visit ladder — how many punches a card holds, which
// visits earn which reward, the labels shown to guests and staff, and the
// "X more visits 'til…" copy — lives here. API routes and UI components all
// import from this module so a program change is a one-file edit, not a hunt
// across a dozen files.
//
// The current ladder (Casa Familia Rewards): free agua fresca at the 3rd
// visit, free dessert at the 5th, free appetizer at the 10th, then the card
// resets and repeats. A separate lifetime visit count (members.lifetime_visits)
// is never reset and is maintained by the check-in routes, not this module.

export const CARD_SIZE = 10; // visits per card cycle; card resets after this

export type RewardType =
  | "welcome_chips_queso"
  | "punch_agua"
  | "punch_dessert"
  | "punch_appetizer"
  | "birthday_treat"
  // legacy types kept so any rows created before this ladder still render
  | "punch_entree"
  | "birthday_entree";

// Reward types earned by reaching a visit milestone (i.e. not the welcome
// treat or birthday reward).
export type MilestoneRewardType = Extract<
  RewardType,
  "punch_agua" | "punch_dessert" | "punch_appetizer"
>;

export type MilestoneSlug = "agua" | "dessert" | "appetizer";

export type Milestone = {
  visit: number; // which visit in the cycle earns it
  type: MilestoneRewardType;
  slug: MilestoneSlug; // used for CSS hooks on the punch dots
  label: string; // canonical short label
  emoji: string;
};

// The visit ladder for one card cycle, ordered by visit number.
export const MILESTONES: Milestone[] = [
  { visit: 3, type: "punch_agua", slug: "agua", label: "Free agua fresca", emoji: "🥤" },
  { visit: 5, type: "punch_dessert", slug: "dessert", label: "Free dessert", emoji: "🍰" },
  { visit: CARD_SIZE, type: "punch_appetizer", slug: "appetizer", label: "Free appetizer", emoji: "🌮" },
];

// Reward type granted at signup.
export const WELCOME_REWARD: RewardType = "welcome_chips_queso";

// Reward earned when a check-in brings the card to `progress`.
// Mirrors the historical rule: the entrée lands at the card size (or beyond,
// defensively), dessert lands on its exact milestone visit.
export function rewardForVisit(progress: number): MilestoneRewardType | null {
  if (progress >= CARD_SIZE) return "punch_appetizer";
  const m = MILESTONES.find((x) => x.visit === progress);
  return m ? m.type : null;
}

// Progress to store after a check-in: reset to 0 once the card is complete.
export function nextProgress(progress: number): number {
  return progress >= CARD_SIZE ? 0 : progress;
}

// "X more visits 'til a free …" line for the check-in screen.
export function nextRewardLine(progress: number): string {
  if (progress >= CARD_SIZE) return "";
  const next = MILESTONES.find((m) => progress < m.visit);
  if (!next) return "";
  const left = next.visit - progress;
  const treat =
    next.slug === "agua"
      ? "agua fresca 🥤"
      : next.slug === "dessert"
        ? "dessert 🍰"
        : "appetizer 🌮";
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
  punch_agua: "Free agua fresca",
  punch_dessert: "Free dessert",
  punch_appetizer: "Free appetizer",
  birthday_treat: "Birthday reward",
  // legacy
  punch_entree: "Free entrée",
  birthday_entree: "Birthday entrée",
};
export function rewardLabel(type: string): string {
  return REWARD_LABELS[type as RewardType] ?? type;
}

// Detailed label with milestone context, used on the admin member page.
export const REWARD_LABELS_DETAILED: Record<RewardType, string> = {
  welcome_chips_queso: "Chips & queso (welcome)",
  punch_agua: `Free agua fresca (${MILESTONES[0].visit} visits)`,
  punch_dessert: `Free dessert (${MILESTONES[1].visit} visits)`,
  punch_appetizer: `Free appetizer (${CARD_SIZE} visits)`,
  birthday_treat: "Birthday reward (appetizer or specialty drink)",
  // legacy
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

// ── Birthday reward ───────────────────────────────────────────────────────
// Granted once per year when a member checks in during their birthday week.
// The guest chooses an appetizer or a specialty drink at the table, so it's a
// single reward type; the label conveys the choice.
export const BIRTHDAY_REWARD: RewardType = "birthday_treat";

// A Phoenix calendar day (no DST) as a UTC-midnight Date, for week math.
function phoenixDayUTC(ref: Date): Date {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ref); // "YYYY-MM-DD"
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// The birthday's occurrence in a given year (Feb 29 → Feb 28 in non-leap years).
function birthdayInYear(year: number, month: number, day: number): Date {
  const d = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  return new Date(Date.UTC(year, month - 1, d));
}

// True if `ref` (default: now) falls in the Sun–Sat week containing the
// member's birthday. Adjacent years are checked so the Dec/Jan boundary works.
export function isBirthdayWeek(
  birthMonth: number | null,
  birthDay: number | null,
  ref: Date = new Date(),
): boolean {
  if (!birthMonth || !birthDay) return false;
  const today = phoenixDayUTC(ref);
  const y = today.getUTCFullYear();
  for (const year of [y - 1, y, y + 1]) {
    const bday = birthdayInYear(year, birthMonth, birthDay);
    const weekStart = new Date(bday);
    weekStart.setUTCDate(bday.getUTCDate() - bday.getUTCDay()); // back to Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6); // Saturday
    if (today >= weekStart && today <= weekEnd) return true;
  }
  return false;
}
