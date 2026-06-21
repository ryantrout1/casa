export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import BookingManager, { type Booking } from "./BookingManager";

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
           policy_ack, status, source, emailed,
           internal_notes, deposit_paid, deposit_amount, follow_up_date
    from bookings where id = ${id}
  `) as Booking[];
  if (rows.length === 0) notFound();

  return <BookingManager booking={rows[0]} />;
}
