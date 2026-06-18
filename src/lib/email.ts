const FROM = "Casa de Leyva <rewards@updates.casadeleyva.com>";
const ADDRESS = "424 E Monroe Ave, Buckeye, AZ 85326";

export function renderEmail(
  bodyHtml: string,
  unsubscribeUrl: string,
  logoUrl: string,
): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f5f5;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#222222;">
        <tr><td style="background:#ffffff;padding:24px 28px 18px;text-align:center;">
          <img src="${logoUrl}" alt="Casa de Leyva" width="220" style="width:220px;max-width:75%;height:auto;display:inline-block;border:0;">
        </td></tr>
        <tr><td style="padding:0;font-size:0;line-height:0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td height="4" style="height:4px;line-height:4px;font-size:0;background:#3B628D;">&nbsp;</td>
            <td height="4" style="height:4px;line-height:4px;font-size:0;background:#EF7126;">&nbsp;</td>
            <td height="4" style="height:4px;line-height:4px;font-size:0;background:#775AA9;">&nbsp;</td>
            <td height="4" style="height:4px;line-height:4px;font-size:0;background:#55B1AD;">&nbsp;</td>
            <td height="4" style="height:4px;line-height:4px;font-size:0;background:#DB53A9;">&nbsp;</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px;font-size:16px;line-height:1.6;color:#222222;">${bodyHtml}</td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #eeeeee;font-size:12px;color:#888888;line-height:1.6;">
          You're receiving this as a Casa Rewards member.<br>
          ${ADDRESS}<br>
          <a href="${unsubscribeUrl}" style="color:#888888;">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

type Email = { to: string; subject: string; html: string };

// Resend batch endpoint: up to 100 individual emails per call.
export async function sendBatch(emails: Email[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const payload = emails.map((e) => ({
    from: FROM,
    to: [e.to],
    subject: e.subject,
    html: e.html,
  }));

  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
  return res.json();
}
