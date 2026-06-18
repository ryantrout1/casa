import { Webhook } from "svix";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // Verify the Svix signature Resend sends (skip only if no secret configured).
  if (secret) {
    try {
      const wh = new Webhook(secret);
      wh.verify(body, {
        "svix-id": req.headers.get("svix-id") ?? "",
        "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
        "svix-signature": req.headers.get("svix-signature") ?? "",
      });
    } catch {
      return new Response("invalid signature", { status: 401 });
    }
  }

  let evt: { type?: string; data?: { email_id?: string; id?: string } };
  try {
    evt = JSON.parse(body);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const type = String(evt?.type ?? "");
  const emailId = evt?.data?.email_id ?? evt?.data?.id ?? null;
  if (!type || !emailId) return new Response("ok", { status: 200 });

  try {
    const sql = db();
    const sends = (await sql`
      select id from email_sends where resend_id = ${emailId} limit 1
    `) as { id: string }[];
    const sendId = sends.length ? sends[0].id : null;
    await sql`
      insert into email_events (resend_id, send_id, event_type)
      values (${emailId}, ${sendId}, ${type})
    `;
  } catch {
    // never fail the webhook on a logging error — Resend would just retry
  }

  return new Response("ok", { status: 200 });
}
