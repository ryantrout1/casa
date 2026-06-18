export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";

type Row = {
  id: string;
  created_at: string;
  package: string;
  package_name: string | null;
  contact_name: string | null;
  event_date: string | null;
  event_type: string | null;
  guest_count: string | null;
  estimate: number | null;
  status: string;
  emailed: boolean;
};

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
function money(n: number | null): string {
  return typeof n === "number" ? `$${n.toLocaleString("en-US")}` : "—";
}
function dash(s: string | null): string {
  return s && s.trim() ? s : "—";
}

export default async function BookingsPage() {
  const sql = db();
  const rows = (await sql`
    select id, created_at, package, package_name, contact_name,
           event_date, event_type, guest_count, estimate, status, emailed
    from bookings
    order by created_at desc
    limit 200
  `) as Row[];

  const newCount = rows.filter((r) => r.status === "new").length;

  return (
    <>
      <h1>Bookings</h1>
      <p className="lede">
        Catering &amp; event requests from the website.{" "}
        {rows.length > 0 ? (
          <>
            <strong>{newCount}</strong> new of <strong>{rows.length}</strong>{" "}
            total.
          </>
        ) : null}
      </p>

      <div className="panel">
        <h2>Requests</h2>
        {rows.length === 0 ? (
          <p className="muted">
            No requests yet. They&apos;ll show up here the moment someone
            submits a catering form.
          </p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Received</th>
                <th>Package</th>
                <th>Name</th>
                <th>Event date</th>
                <th>Guests</th>
                <th>Est.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDateTime(r.created_at)}</td>
                  <td>{dash(r.package_name ?? r.package)}</td>
                  <td>
                    <Link href={`/cocina/bookings/${r.id}`}>
                      {dash(r.contact_name)}
                    </Link>
                  </td>
                  <td>{dash(r.event_date)}</td>
                  <td>{dash(r.guest_count)}</td>
                  <td>{money(r.estimate)}</td>
                  <td>
                    {r.status === "new" ? <strong>new</strong> : r.status}
                    {!r.emailed ? (
                      <span className="muted"> · ✉︎ not sent</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
