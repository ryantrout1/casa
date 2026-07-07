export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import MembersTable, { type Member } from "./MembersTable";

export default async function Members() {
  const sql = db();
  const rows = (await sql`
    select id, name, email, phone, punch_progress, lifetime_visits, last_visit_at,
           birth_month, birth_day
    from members
    order by last_visit_at desc nulls last
    limit 5000
  `) as Member[];

  return <MembersTable members={rows} />;
}
