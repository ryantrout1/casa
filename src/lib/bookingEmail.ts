export type BookingInput = {
  package: string;
  packageName?: string | null;
  price?: string | null;
  estimate?: number | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  eventDate?: string | null;
  eventType?: string | null;
  guestCount?: string | null;
  startTime?: string | null;
  serviceStyle?: string | null;
  barType?: string | null;
  proteins?: string[];
  beers?: string[];
  tortillas?: string | null;
  notes?: string | null;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function bookingSubject(b: BookingInput): string {
  const who = (b.contactName ?? "").trim() || b.email || b.phone || "New lead";
  const pkg = b.packageName || b.package;
  return `New event request — ${pkg} — ${who}`;
}

export function bookingEmailHtml(b: BookingInput): string {
  const row = (label: string, val?: string | null): string =>
    val && String(val).trim()
      ? `<tr><td style="padding:5px 14px 5px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:5px 0;color:#111;font-weight:600">${esc(String(val))}</td></tr>`
      : "";

  const estimate = typeof b.estimate === "number" ? `$${b.estimate.toLocaleString("en-US")}` : "";
  const proteins = b.proteins && b.proteins.length ? b.proteins.join(", ") : "";
  const beers = b.beers && b.beers.length ? b.beers.join(", ") : "";

  const rows =
    row("Package", b.packageName || b.package) +
    row("List price", b.price) +
    row("Estimate (+20%)", estimate) +
    row("Name", b.contactName) +
    row("Email", b.email) +
    row("Phone", b.phone) +
    row("Event date", b.eventDate) +
    row("Event type", b.eventType) +
    row("Guests", b.guestCount) +
    row("Start time", b.startTime) +
    row("Service style", b.serviceStyle) +
    row("Bar", b.barType) +
    row("Proteins", proteins) +
    row("Beers", beers) +
    row("Tortillas", b.tortillas) +
    row("Notes", b.notes);

  return `<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
  <h2 style="color:#3B628D;margin:0 0 4px">New event request</h2>
  <p style="color:#6b7280;margin:0 0 16px;font-size:14px">Submitted through the website catering page. Reply to this email to respond to the guest directly.</p>
  <table style="border-collapse:collapse;font-size:15px">${rows}</table>
</div>`;
}

export function bookingAckSubject(): string {
  return "We got your event request — Casa de Leyva";
}

export function bookingAckHtml(b: BookingInput): string {
  const first = (b.contactName ?? "").trim().split(/\s+/)[0] || "there";
  const pkg = b.packageName || b.package;
  const dateBit =
    b.eventDate && b.eventDate.trim() ? ` for ${esc(b.eventDate)}` : "";
  return `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">
  <div style="height:6px;background:linear-gradient(90deg,#DB53A9,#EF7126,#FFBF1F,#55B1AD,#775AA9);border-radius:3px;margin-bottom:22px"></div>
  <h2 style="color:#3B628D;margin:0 0 12px">¡Gracias, ${esc(first)}!</h2>
  <p style="font-size:16px;line-height:1.6;margin:0 0 14px">
    Just letting you know we received your request for the <strong>${esc(pkg)}</strong>${dateBit}. This isn&rsquo;t a confirmation yet — someone from our team will reach out soon to go over the details and next steps.
  </p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 14px">
    Need us sooner? Give us a call at <a href="tel:623-306-2386" style="color:#EF7126;font-weight:600">623-306-2386</a>.
  </p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 18px">¡Nos vemos pronto!</p>
  <p style="font-size:14px;color:#6b7280;margin:0">
    Casa de Leyva · Mexican Restaurant &amp; Cantina<br>424 E Monroe Ave, Buckeye, AZ
  </p>
</div>`;
}
