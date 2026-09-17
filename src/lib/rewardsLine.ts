import { CARD_SIZE, MILESTONES } from "./rewards";
import { REWARDS_TOKEN } from "./emailTemplate";

// The one personalized line in a campaign email, written per member at send
// time. Kept to a single sentence on purpose: the email's job is to fill the
// room, and this is a nudge on the way out.
//
// Pure and client-safe, so the composer can show an example of it.

const TREAT: Record<string, { name: string; emoji: string }> = {
  agua: { name: "agua fresca", emoji: "🥤" },
  dessert: { name: "dessert", emoji: "🍰" },
  appetizer: { name: "appetizer", emoji: "🌮" },
};

/**
 * What to say to a member with this many punches.
 *
 * Three cases, because 133 of 285 members have none: a full card has a reward
 * waiting, a started card counts down, and an empty card gets an invitation
 * rather than "you have 0".
 */
export function rewardsLine(progress: number | null): string {
  const p =
    typeof progress === "number" && Number.isFinite(progress) ? Math.floor(progress) : 0;

  if (p >= CARD_SIZE) return "You have a free appetizer waiting. Just ask your server. 🌮";
  if (p <= 0) {
    return "Not started your card yet? Scan at the register on your visit — your first reward is 3 visits away. 🥤";
  }

  const next = MILESTONES.find((m) => p < m.visit);
  // Unreachable: p < CARD_SIZE and the last milestone is CARD_SIZE.
  if (!next) return "";
  const left = next.visit - p;
  const treat = TREAT[next.slug];
  return `You're ${left} visit${left > 1 ? "s" : ""} from a free ${treat.name}. ${treat.emoji}`;
}

/**
 * Put the member's line into a rendered email, or take the token out.
 *
 * Always removes the token, whichever way it goes: a token that reached an
 * inbox as visible text would be the system talking to itself. A body with no
 * token is returned untouched, so campaigns written before this existed send
 * exactly as they did.
 */
export function applyRewards(html: string, progress: number | null, include = true): string {
  if (!html.includes(REWARDS_TOKEN)) return html;
  return html.split(REWARDS_TOKEN).join(include ? rewardsLine(progress) : "");
}
