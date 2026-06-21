import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUSES = [
  "new",
  "contacted",
  "quoted",
  "confirmed",
  "completed",
  "cancelled",
];

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sql = db();
    const b = await req.json();

    const status = String(b.status ?? "new").trim();
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const contactName = clean(b.contactName);
    if (!contactName) {
      return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    }

    const estRaw = b.estimate;
    const estimate =
      estRaw === null || estRaw === undefined || String(estRaw).trim() === ""
        ? null
        : Number.isFinite(Number(estRaw))
          ? Math.round(Number(estRaw))
          : null;

    const rows = (await sql`
      update bookings set
        status = ${status},
        follow_up_date = ${clean(b.followUpDate)},
        deposit_paid = ${Boolean(b.depositPaid)},
        deposit_amount = ${clean(b.depositAmount)},
        internal_notes = ${clean(b.internalNotes)},
        contact_name = ${contactName},
        email = ${clean(b.email)},
        phone = ${clean(b.phone)},
        event_date = ${clean(b.eventDate)},
        event_type = ${clean(b.eventType)},
        guest_count = ${clean(b.guestCount)},
        start_time = ${clean(b.startTime)},
        estimate = ${estimate},
        notes = ${clean(b.notes)}
      where id = ${id}
      returning id
    `) as { id: string }[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sql = db();
    await sql`delete from bookings where id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete." },
      { status: 500 },
    );
  }
}
