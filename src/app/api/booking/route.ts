import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingSubject, bookingEmailHtml, bookingAckSubject, bookingAckHtml } from "@/lib/bookingEmail";

export const dynamic = "force-dynamic";

const RESEND_URL = "https://api.resend.com/emails";
const FROM = "Casa de Leyva Events <rewards@updates.casadeleyva.com>";

export async function POST(req: Request) {
  try {
    const sql = db();
    const b = await req.json();

    const pkg = String(b.package ?? "").trim();
    const contactName = String(b.contactName ?? "").trim();
    const email = String(b.email ?? "").trim();
    const phone = String(b.phone ?? "").trim();

    if (!pkg || !contactName || (!email && !phone)) {
      return NextResponse.json(
        { error: "Please include your name and a phone or email." },
        { status: 400 },
      );
    }

    const proteins = Array.isArray(b.proteins) ? b.proteins.map(String) : [];
    const beers = Array.isArray(b.beers) ? b.beers.map(String) : [];
    const estimate = Number.isFinite(Number(b.estimate)) ? Math.round(Number(b.estimate)) : null;

    // Save the lead FIRST — the database is the system of record.
    const rows = (await sql`
      insert into bookings
        (package, package_name, price, estimate, contact_name, email, phone,
         event_date, event_type, guest_count, start_time, service_style, bar_type,
         proteins, beers, tortillas, notes, policy_ack)
      values
        (${pkg}, ${b.packageName ?? null}, ${b.price ?? null}, ${estimate},
         ${contactName}, ${email || null}, ${phone || null},
         ${b.eventDate ?? null}, ${b.eventType ?? null}, ${b.guestCount ?? null},
         ${b.startTime ?? null}, ${b.serviceStyle ?? null}, ${b.barType ?? null},
         ${proteins}, ${beers}, ${b.tortillas ?? null}, ${b.notes ?? null},
         ${Boolean(b.policyAck)})
      returning id
    `) as { id: string }[];
    const id = rows[0].id;

    // Notify the restaurant. An email failure must NEVER lose the saved lead.
    const to = process.env.BOOKINGS_TO || "ryan@casadeleyva.com";
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(RESEND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM,
            to: [to],
            reply_to: email || undefined,
            subject: bookingSubject({ ...b, package: pkg, contactName }),
            html: bookingEmailHtml({
              ...b,
              package: pkg,
              contactName,
              email,
              phone,
              proteins,
              beers,
              estimate,
            }),
          }),
        });
        if (res.ok) {
          await sql`update bookings set emailed = true where id = ${id}`;
        }
      } catch {
        // Swallow: the lead is already saved; emailed stays false as the signal.
      }

      // Send the guest a friendly acknowledgement (not a confirmation).
      // Replies route to the restaurant inbox. Failure here is non-fatal.
      if (email) {
        try {
          await fetch(RESEND_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: FROM,
              to: [email],
              reply_to: to,
              subject: bookingAckSubject(),
              html: bookingAckHtml({ ...b, package: pkg, contactName }),
            }),
          });
        } catch {
          // Non-fatal: the guest just won't get the acknowledgement.
        }
      }
    }

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not submit your request. Please call us." },
      { status: 500 },
    );
  }
}
