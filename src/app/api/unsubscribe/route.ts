import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const m = (url.searchParams.get("m") ?? "").trim();

  let message: string;
  if (m === "test") {
    message = "This is a test unsubscribe link — nothing was changed.";
  } else if (!m) {
    message = "We couldn't process that unsubscribe link.";
  } else {
    try {
      const sql = db();
      await sql`update members set email_subscribed = false where id = ${m}`;
      message =
        "You've been unsubscribed. You won't receive any more Casa Rewards emails.";
    } catch {
      message = "We couldn't process that unsubscribe link.";
    }
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Casa de Leyva</title></head>
<body style="font-family:Helvetica,Arial,sans-serif;background:#f5f5f5;margin:0;padding:60px 20px;text-align:center;color:#222;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;">
    <h1 style="color:#3B628D;font-size:22px;margin:0 0 12px;">Casa de Leyva</h1>
    <p style="font-size:16px;line-height:1.6;">${message}</p>
  </div>
</body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
