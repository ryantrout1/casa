import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import { renderEmail, sendBatch } from "@/lib/email";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Keep only email-safe tags/attributes from the editor output.
function clean(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "b", "strong", "i", "em", "u", "a",
      "ul", "ol", "li", "h2", "h3", "div", "span", "blockquote", "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "style", "width"],
      p: ["style"],
      div: ["style"],
      span: ["style"],
      h2: ["style"],
      h3: ["style"],
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

export async function POST(req: Request) {
  try {
    const sql = db();
    const body = await req.json();
    const action = String(body.action ?? "");
    const subject = String(body.subject ?? "").trim();
    const html = clean(String(body.html ?? ""));

    const textOnly = html.replace(/<[^>]+>/g, "").trim();
    const hasContent = textOnly.length > 0 || html.includes("<img");
    if (!subject || !hasContent) {
      return NextResponse.json(
        { error: "Subject and a message are both required." },
        { status: 400 },
      );
    }

    const origin = new URL(req.url).origin;

    if (action === "test") {
      const testEmail = String(body.testEmail ?? "").trim();
      if (!testEmail) {
        return NextResponse.json({ error: "A test email address is required." }, { status: 400 });
      }
      const emailHtml = renderEmail(html, `${origin}/api/unsubscribe?m=test`, `${origin}/email/logo.jpg`);
      await sendBatch([{ to: testEmail, subject, html: emailHtml }]);
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
        html: renderEmail(html, `${origin}/api/unsubscribe?m=${m.id}`, `${origin}/email/logo.jpg`),
      }));

      let sent = 0;
      for (const group of chunk(emails, 100)) {
        await sendBatch(group);
        sent += group.length;
      }

      await sql`
        insert into campaigns (subject, body, audience_count, sent_count, status)
        values (${subject}, ${html}, ${members.length}, ${sent}, 'sent')
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
