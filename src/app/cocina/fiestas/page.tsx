export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import FiestaManager, { type FiestaAdminRow } from "./FiestaManager";

export default async function FiestasAdmin() {
  const sql = db();
  const rows = (await sql`
    select id, image_url, caption, event_date::text as event_date,
           to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as starts_at,
           is_hero, in_grid, on_fiestas_page, is_evergreen,
           hero_title, hero_script, hero_ribbon, hero_sub, hero_lang,
           hero_title_alt, hero_script_alt, hero_ribbon_alt, hero_sub_alt,
           hero_focus, hero_bg, hero_accent, hero_ink,
           to_char(hero_live_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hero_live_at
    from fiestas
    order by featured_at desc nulls last, created_at desc
  `) as FiestaAdminRow[];

  return <FiestaManager fiestas={rows} />;
}
