export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

type Booking = {
  id: string;
  created_at: string;
  package: string;
  package_name: string | null;
  price: string | null;
  estimate: number | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  event_date: string | null;
  event_type: string | null;
  guest_count: string | null;
  start_time: string | null;
  service_style: string | null;
  bar_type: string | null;
  proteins: string[] | null;
  beers: string[] | null;
  tortillas: string | null;
  notes: string | null;
  policy_ack: boolean;
  status: string;
  source: string;
  emailed: boolean;
};

function fmt(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
function list(a: string[] | null): string {
  return a && a.length ? a.join(", ") : "—";
}

export default async function BookingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sql = db();
  const rows = (await sql`
    select id, created_at, package, package_name, price, estimate, contact_name,
           email, phone, event_date, event_type, guest_count, start_time,
           service_style, bar_type, proteins, beers, tortillas, notes,
           policy_ack, status, source, emailed
    from bookings where id = ${id}
  `) as Booking[];
  if (rows.length === 0) notFound();
  const b = rows[0];

  return (
    <>
      <p className="muted">
        <Link href="/cocina/bookings">← All bookings</Link>
      </p>
      <h1>{dash(b.contact_name)}</h1>
      <p className="lede">
        {dash(b.package_name ?? b.package)} · requested {fmt(b.created_at)}
      </p>

      <div className="panel">
        <h2>Contact</h2>
        <table className="t">
          <tbody>
            <tr>
              <td>Name</td>
              <td>{dash(b.contact_name)}</td>
            </tr>
            <tr>
              <td>Email</td>
              <td>
                {b.email ? <a href={`mailto:${b.email}`}>{b.email}</a> : "—"}
              </td>
            </tr>
            <tr>
              <td>Phone</td>
              <td>{b.phone ? <a href={`tel:${b.phone}`}>{b.phone}</a> : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Event</h2>
        <table className="t">
          <tbody>
            <tr>
              <td>Package</td>
              <td>{dash(b.package_name ?? b.package)}</td>
            </tr>
            <tr>
              <td>List price</td>
              <td>{dash(b.price)}</td>
            </tr>
            <tr>
              <td>Estimate (+20%)</td>
              <td>{money(b.estimate)}</td>
            </tr>
            <tr>
              <td>Event date</td>
              <td>{dash(b.event_date)}</td>
            </tr>
            <tr>
              <td>Event type</td>
              <td>{dash(b.event_type)}</td>
            </tr>
            <tr>
              <td>Guests</td>
              <td>{dash(b.guest_count)}</td>
            </tr>
            <tr>
              <td>Start time</td>
              <td>{dash(b.start_time)}</td>
            </tr>
            <tr>
              <td>Service style</td>
              <td>{dash(b.service_style)}</td>
            </tr>
            <tr>
              <td>Bar</td>
              <td>{dash(b.bar_type)}</td>
            </tr>
            <tr>
              <td>Proteins</td>
              <td>{list(b.proteins)}</td>
            </tr>
            <tr>
              <td>Beers</td>
              <td>{list(b.beers)}</td>
            </tr>
            <tr>
              <td>Tortillas</td>
              <td>{dash(b.tortillas)}</td>
            </tr>
            <tr>
              <td>Notes</td>
              <td>{dash(b.notes)}</td>
            </tr>
            <tr>
              <td>Agreed to deposit &amp; policies</td>
              <td>{b.policy_ack ? "Yes" : "No"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Internal</h2>
        <table className="t">
          <tbody>
            <tr>
              <td>Status</td>
              <td>{b.status}</td>
            </tr>
            <tr>
              <td>Source</td>
              <td>{b.source}</td>
            </tr>
            <tr>
              <td>Notification email</td>
              <td>
                {b.emailed
                  ? "Sent to the restaurant"
                  : "Not sent (lead still saved)"}
              </td>
            </tr>
            <tr>
              <td>Received</td>
              <td>{fmt(b.created_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
