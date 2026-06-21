export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import BookingRow from "./BookingRow";

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
function fmtDate(s: string | null): string {
  if (!s || !s.trim()) return "—";
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
                <BookingRow
                  key={r.id}
                  id={r.id}
                  received={fmtDateTime(r.created_at)}
                  pkg={dash(r.package_name ?? r.package)}
                  name={dash(r.contact_name)}
                  eventDate={fmtDate(r.event_date)}
                  guests={dash(r.guest_count)}
                  est={money(r.estimate)}
                  status={r.status}
                  emailed={r.emailed}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
