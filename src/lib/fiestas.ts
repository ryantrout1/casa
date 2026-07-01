import { db } from "./db";

// A fiesta row as read from Neon. `sort_key` is derived at query time
// (epoch of featured_at, falling back to created_at) so ordering is a plain
// numeric comparison — deterministic and unit-testable. `event_date` is cast
// to text ('YYYY-MM-DD') so date checks are string comparisons, independent of
// how the driver hydrates a `date` column.
export type FiestaRow = {
  id: string;
  image_url: string;
  alt: string;
  caption: string | null;
  event_date: string | null;
  is_hero: boolean;
  in_grid: boolean;
  on_fiestas_page: boolean;
  is_evergreen: boolean;
  sort_key: number;
};

// The presentational shape FiestaGallery consumes. Structurally identical to
// FiestaGallery's FlyerItem; kept separate to avoid importing a client
// component (and its non-server deps) into this server module.
export type Flyer = { src: string; alt: string; cap?: string };

// The homepage grid shows at most this many fiestas.
export const GRID_LIMIT = 6;

// Is this fiesta live for the "upcoming" surfaces (hero + grid)?
// Evergreen (recurring) and undated fiestas always are; dated ones only until
// their date passes. The fiestas page ignores this and keeps everything.
export function isCurrent(f: FiestaRow, today: string): boolean {
  if (f.is_evergreen) return true;
  if (!f.event_date) return true;
  return f.event_date >= today;
}

// Newest-announced first: higher sort_key leads. Pure, non-mutating.
export function orderFiestas(rows: FiestaRow[]): FiestaRow[] {
  return [...rows].sort((a, b) => b.sort_key - a.sort_key);
}

export function toFlyer(f: FiestaRow): Flyer {
  return { src: f.image_url, alt: f.alt, cap: f.caption ?? undefined };
}

// Homepage grid: grid-flagged, still current, newest first, capped at 6.
export function selectGrid(rows: FiestaRow[], today: string): FiestaRow[] {
  return orderFiestas(
    rows.filter((f) => f.in_grid && isCurrent(f, today)),
  ).slice(0, GRID_LIMIT);
}

// Fiestas page: everything flagged for it, newest first, no date filter.
export function selectAll(rows: FiestaRow[]): FiestaRow[] {
  return orderFiestas(rows.filter((f) => f.on_fiestas_page));
}

// Hero: the single current hero (highest sort_key if more than one is flagged,
// which the DB's partial unique index normally prevents).
export function selectHero(rows: FiestaRow[], today: string): FiestaRow | null {
  const heroes = orderFiestas(
    rows.filter((f) => f.is_hero && isCurrent(f, today)),
  );
  return heroes[0] ?? null;
}

// America/Phoenix has no DST, so a fixed offset is safe. en-CA yields ISO
// 'YYYY-MM-DD', matching the event_date cast for direct string comparison.
function phoenixToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
}

async function loadFiestas(): Promise<FiestaRow[]> {
  try {
    const sql = db();
    return (await sql`
      select
        id,
        image_url,
        alt,
        caption,
        event_date::text as event_date,
        is_hero,
        in_grid,
        on_fiestas_page,
        is_evergreen,
        extract(epoch from coalesce(featured_at, created_at))::float8 as sort_key
      from fiestas
    `) as FiestaRow[];
  } catch {
    // Never let a DB hiccup blank the homepage — callers fall back gracefully.
    return [];
  }
}

export async function getGridFiestas(): Promise<Flyer[]> {
  const rows = await loadFiestas();
  return selectGrid(rows, phoenixToday()).map(toFlyer);
}

export async function getAllFiestas(): Promise<Flyer[]> {
  const rows = await loadFiestas();
  return selectAll(rows).map(toFlyer);
}

export async function getHeroFiesta(): Promise<Flyer | null> {
  const rows = await loadFiestas();
  const hero = selectHero(rows, phoenixToday());
  return hero ? toFlyer(hero) : null;
}
