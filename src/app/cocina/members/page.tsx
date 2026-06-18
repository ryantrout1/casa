export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  punch_progress: number;
  last_visit_at: string | null;
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function Members({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const sql = db();

  const rows = term
    ? ((await sql`
        select id, name, email, phone, punch_progress, last_visit_at
        from members
        where name ilike ${"%" + term + "%"}
           or email ilike ${"%" + term + "%"}
           or phone ilike ${"%" + term + "%"}
        order by last_visit_at desc nulls last
        limit 100
      `) as Row[])
    : ((await sql`
        select id, name, email, phone, punch_progress, last_visit_at
        from members
        order by last_visit_at desc nulls last
        limit 100
      `) as Row[]);

  return (
    <>
      <h1>Members</h1>
      <p className="lede">
        {term ? `Results for “${term}”` : "Most recently active first"} — {rows.length}
        {rows.length === 100 ? "+" : ""} shown.
      </p>

      <form className="search" method="get">
        <input
          type="text"
          name="q"
          defaultValue={term}
          placeholder="Search by name, email, or phone"
          autoComplete="off"
        />
        <button type="submit">Search</button>
      </form>

      <div className="panel">
        <table className="t">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Card</th>
              <th>Last visit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/cocina/members/${m.id}`}>
                    {m.name ?? <span className="muted">(no name)</span>}
                  </Link>
                </td>
                <td>{m.email ?? m.phone ?? <span className="muted">—</span>}</td>
                <td>{m.punch_progress} / 10</td>
                <td>{fmtDate(m.last_visit_at)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No members match that search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
