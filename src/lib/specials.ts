// Weekly food specials + the day-of-week selector that drives the homepage
// "Today at Casa" spotlight. Pure and client-safe (no db, no Node deps) so the
// server component can render it and vitest can pin the logic.

export type Accent = "teal" | "yel" | "orng" | "mag" | "purp"; // brand-token key

// A drink shown beside the featured special. Optional: a day without a
// verified drink special shows no pairing card rather than a made-up one.
export type Pairing = {
  photo: string; // /images/... path
  alt: string;
  text: string;
};

export type Special = {
  id: string;
  day: string; // display label, e.g. "Tuesday" / "Weekends"
  title: string;
  blurb: string;
  price?: string; // some specials (Molcajete) have no fixed price
  accent: Accent;
  photo?: string; // /images/... path; falls back to the solid card when unset
  includes: string[]; // 1-3 short chips shown on the featured card
  pair?: Pairing;
  days: number[]; // Phoenix weekday indices this special is featured (0=Sun)
};

// Order here is the rail order. Monday (1) is intentionally absent (closed).
export const SPECIALS: Special[] = [
  {
    id: "taco",
    day: "Tuesday",
    title: "Taco Tuesday",
    blurb: "All-you-can-eat. Build your own, your way.",
    price: "$19.99",
    accent: "teal",
    photo: "/images/SPEC_TACO.jpg",
    includes: ["Carne asada", "Chicken", "Al pastor"],
    pair: {
      photo: "/images/PAIR_MARGARITA.jpg",
      alt: "Margarita with a salted rim and a lime wheel",
      text: "Add a margarita for only $5",
    },
    days: [2],
  },
  {
    id: "fajita",
    day: "Wednesday",
    title: "Fajita Wednesday",
    blurb: "Chicken, steak or shrimp",
    price: "$15.99",
    accent: "yel",
    photo: "/images/SPEC_FAJITA.jpg",
    includes: ["Chicken", "Steak", "Shrimp"],
    days: [3],
  },
  {
    id: "enchilada",
    day: "Thursday",
    title: "Enchilada Thursday",
    blurb: "Enchiladas plate · rice & beans",
    price: "$14.99",
    accent: "orng",
    photo: "/images/SPEC_ENCHILADA.jpg",
    includes: ["Enchiladas", "Rice", "Beans"],
    days: [4],
  },
  {
    id: "seafood",
    day: "Friday",
    title: "Seafood Friday",
    blurb: "Mexican seafood plate · fresh & bold",
    price: "$16.99",
    accent: "mag",
    photo: "/images/SPEC_SEAFOOD.jpg",
    includes: ["Fresh", "Bold", "Full of flavor"],
    days: [5],
  },
  {
    id: "molcajete",
    day: "Weekends",
    title: "Molcajete Weekends",
    blurb: "The molcajete meant for one, perfect for two",
    accent: "purp",
    photo: "/images/SPEC_MOLCAJETE.jpg",
    includes: ["Meant for one", "Perfect for two"],
    days: [6, 0], // Sat & Sun
  },
];

// The Phoenix calendar weekday (0=Sun … 6=Sat) for a given instant. Arizona
// never observes DST, but we anchor via the IANA zone so the boundary is exact:
// format the instant in Phoenix, then read the weekday off that calendar date.
export function phoenixWeekday(now: Date): number {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD"
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// The special to feature today, or null when closed (Monday).
export function specialForDay(weekday: number): Special | null {
  return SPECIALS.find((s) => s.days.includes(weekday)) ?? null;
}
