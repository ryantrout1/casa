export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { phoenixToday } from "@/lib/websiteNow";
import FiestaManager, { type FiestaAdminRow } from "./FiestaManager";

// What visitors see on casadeleyva.com: the hero now and next, the grid, and
// every flyer ever published (campaign or not). Replaces /cocina/fiestas.
export default async function WebsiteAdmin() {
  const sql = db();
  const rows = (await sql`
    select id, image_url, caption, event_date::text as event_date,
           to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as starts_at,
           is_hero, in_grid, on_fiestas_page, is_evergreen,
           hero_title, hero_script, hero_ribbon, hero_sub, hero_lang,
           hero_title_alt, hero_script_alt, hero_ribbon_alt, hero_sub_alt,
           hero_focus, hero_bg, hero_accent, hero_ink,
           hero_motif, hero_palette, hero_title_colors, hero_tokens,
           hero_plate_url, hero_plate_mobile_url, hero_plate_focus,
           to_char(hero_live_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hero_live_at,
           extract(epoch from coalesce(featured_at, created_at))::float8 as sort_key
    from fiestas
    order by featured_at desc nulls last, created_at desc
  `) as FiestaAdminRow[];

  // One clock for the whole page, taken here so the server render and the
  // client render describe the same moment.
  const nowMs = Date.now();

  return (
    <>
      <h1>Website</h1>
      <p className="lede">
        What visitors see on casadeleyva.com right now. Turn a flyer on or off for the hero, the
        homepage grid, or the Fiestas page. Changes go live immediately.
      </p>
      <FiestaManager fiestas={rows} today={phoenixToday(nowMs)} nowMs={nowMs} />
    </>
  );
}
