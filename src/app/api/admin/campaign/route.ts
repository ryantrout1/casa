import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderEmail, textToHtml, sendBatch } from "@/lib/email";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  try {
    const sql = db();
    const body = await req.json();
    const action = String(body.action ?? "");
    const subject = String(body.subject ?? "").trim();
    const text = String(body.body ?? "").trim();

    if (!subject || !text) {
      return NextResponse.json(
        { error: "Subject and message are both required." },
        { status: 400 },
      );
    }

    const origin = new URL(req.url).origin;
    const bodyHtml = textToHtml(text);

    if (action === "test") {
      const testEmail = String(body.testEmail ?? "").trim();
      if (!testEmail) {
        return NextResponse.json({ error: "A test email address is required." }, { status: 400 });
      }
      const html = renderEmail(bodyHtml, `${origin}/api/unsubscribe?m=test`);
      await sendBatch([{ to: testEmail, subject, html }]);
      return NextResponse.json({ ok: true, sent: 1, test: true });
    }

    if (action === "send") {
      const members = (await sql`
        select id, email from members
        where email_subscribed = true and email is not null
      `) as { id: string; email: string }[];

      if (members.length === 0) {
        return NextResponse.json({ ok: true, sent: 0 });
      }

      const emails = members.map((m) => ({
        to: m.email,
        subject,
        html: renderEmail(bodyHtml, `${origin}/api/unsubscribe?m=${m.id}`),
      }));

      let sent = 0;
      for (const group of chunk(emails, 100)) {
        await sendBatch(group);
        sent += group.length;
      }

      await sql`
        insert into campaigns (subject, body, audience_count, sent_count, status)
        values (${subject}, ${text}, ${members.length}, ${sent}, 'sent')
      `;

      return NextResponse.json({ ok: true, sent });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed." },
      { status: 500 },
    );
  }
}
