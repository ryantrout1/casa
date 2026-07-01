export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import FiestaManager, { type FiestaAdminRow } from "./FiestaManager";

export default async function FiestasAdmin() {
  const sql = db();
  const rows = (await sql`
    select id, image_url, caption, event_date::text as event_date,
           is_hero, in_grid, on_fiestas_page, is_evergreen
    from fiestas
    order by featured_at desc nulls last, created_at desc
  `) as FiestaAdminRow[];

  return <FiestaManager fiestas={rows} />;
}
