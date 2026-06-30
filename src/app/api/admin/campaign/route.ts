import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import { renderEmail, sendBatch } from "@/lib/email";

export const dynamic = "force-dynamic";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function clean(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "b", "strong", "i", "em", "u", "a",
      "ul", "ol", "li", "h2", "h3", "div", "span", "blockquote", "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "style", "width"],
      p: ["style"], div: ["style"], span: ["style"], h2: ["style"], h3: ["style"],
    },
    allowedStyles: {
      "*": {
        width: [/^\d+(\.\d+)?(px|%)$/],
        "max-width": [/^\d+(\.\d+)?(px|%)$/],
        height: [/^auto$/],
        "font-weight": [/^(bold|normal|\d{3})$/],
        "text-align": [/^(left|right|center)$/],
        display: [/^(block|inline|inline-block)$/],
        "border-radius": [/^\d+px$/],
        margin: [/^[\d.\s a-z%]+$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}

type BatchResult = { data?: { id: string }[] };

export async function POST(req: Request) {
  try {
    const sql = db();
    const body = await req.json();
    const action = String(body.action ?? "");
    const subject = String(body.subject ?? "").trim();
    const html = clean(String(body.html ?? ""));

    const textOnly = html.replace(/<[^>]+>/g, "").trim();
    if (!subject || (textOnly.length === 0 && !html.includes("<img"))) {
      return NextResponse.json(
        { error: "Subject and a message are both required." },
        { status: 400 },
      );
    }

    const origin = new URL(req.url).origin;
    const logoUrl = `${origin}/email/logo.jpg`;

    if (action === "test") {
      const testEmail = String(body.testEmail ?? "").trim();
      if (!testEmail) {
        return NextResponse.json({ error: "A test email address is required." }, { status: 400 });
      }
      const emailHtml = renderEmail(html, `${origin}/api/unsubscribe?m=test`, logoUrl);
      const result = (await sendBatch([{ to: testEmail, subject, html: emailHtml }])) as BatchResult;
      const resendId = result?.data?.[0]?.id ?? null;
      // record the test send (no campaign) so the webhook can attach its events
      await sql`
        insert into email_sends (campaign_id, member_id, email, resend_id)
        values (null, null, ${testEmail}, ${resendId})
      `;
      return NextResponse.json({ ok: true, sent: 1, test: true });
    }

    if (action === "send") {
      const members = (await sql`
        select id, email from members
        where email_subscribed = true
          and email is not null
          and email ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'
      `) as { id: string; email: string }[];

      if (members.length === 0) {
        return NextResponse.json({ ok: true, sent: 0 });
      }

      // Create the campaign first so unsubscribe links can carry its id.
      const campaignRows = (await sql`
        insert into campaigns (subject, body, audience_count, sent_count, status)
        values (${subject}, ${html}, ${members.length}, 0, 'sending')
        returning id
      `) as { id: string }[];
      const campaignId = campaignRows[0].id;

      const recipients = members.map((m) => ({
        m: m.id,
        e: m.email.trim(),
        html: renderEmail(
          html,
          `${origin}/api/unsubscribe?m=${m.id}&c=${campaignId}`,
          logoUrl,
        ),
      }));

      const sends: { m: string; e: string; r: string | null }[] = [];
      const batchErrors: string[] = [];
      let sent = 0;
      // Send in batches of 100. Resend rejects an ENTIRE batch if even one
      // address is malformed, so isolate each batch: a single failure skips
      // only that batch and the rest still go out, instead of aborting the
      // whole send (and the audience query already filters invalid emails).
      for (const group of chunk(recipients, 100)) {
        try {
          const result = (await sendBatch(
            group.map((r) => ({ to: r.e, subject, html: r.html })),
          )) as BatchResult;
          const ids = Array.isArray(result?.data) ? result.data : [];
          group.forEach((r, i) => sends.push({ m: r.m, e: r.e, r: ids[i]?.id ?? null }));
          sent += group.length;
        } catch (err) {
          batchErrors.push(err instanceof Error ? err.message : String(err));
        }
      }

      // bulk-insert one email_sends row per recipient that actually sent
      if (sends.length > 0) {
        await sql`
          insert into email_sends (campaign_id, member_id, email, resend_id)
          select ${campaignId}::uuid, (x->>'m')::uuid, x->>'e', x->>'r'
          from json_array_elements(${JSON.stringify(sends)}::json) as x
        `;
      }

      // Always resolve the campaign status — never leave it stuck in 'sending'.
      const finalStatus = sent > 0 ? "sent" : "failed";
      await sql`
        update campaigns set sent_count = ${sent}, status = ${finalStatus} where id = ${campaignId}
      `;

      if (batchErrors.length > 0) {
        return NextResponse.json({
          ok: sent > 0,
          sent,
          skipped: recipients.length - sent,
          warning: batchErrors[0],
        });
      }

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
