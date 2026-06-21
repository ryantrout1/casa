"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type Booking = {
  id: string;
  created_at: string;
  package: string;
  package_name: string | null;
  price: string | null;
  estimate: number | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  event_date: string | null;
  event_type: string | null;
  guest_count: string | null;
  start_time: string | null;
  service_style: string | null;
  bar_type: string | null;
  proteins: string[] | null;
  beers: string[] | null;
  tortillas: string | null;
  notes: string | null;
  policy_ack: boolean;
  status: string;
  source: string;
  emailed: boolean;
  internal_notes: string | null;
  deposit_paid: boolean;
  deposit_amount: string | null;
  follow_up_date: string | null;
};

const STATUSES: { value: string; label: string; accent: string }[] = [
  { value: "new", label: "New", accent: "#E0A100" },
  { value: "contacted", label: "Contacted", accent: "#3B7DC4" },
  { value: "quoted", label: "Quoted", accent: "#8246AF" },
  { value: "confirmed", label: "Confirmed", accent: "#16A89E" },
  { value: "completed", label: "Completed", accent: "#8A93A3" },
  { value: "cancelled", label: "Cancelled", accent: "#C0392B" },
];
const meta = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

function fmt(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
function dash(s: string | null): string {
  return s && s.trim() ? s : "—";
}
function list(a: string[] | null): string {
  return a && a.length ? a.join(", ") : "—";
}

function KV({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`dl-row${wide ? " full" : ""}`}>
      <div className="dl-l">{label}</div>
      <div className="dl-v">{children}</div>
    </div>
  );
}

export default function BookingManager({ booking }: { booking: Booking }) {
  const router = useRouter();

  const init = {
    status: booking.status,
    followUpDate: booking.follow_up_date ?? "",
    depositPaid: booking.deposit_paid,
    depositAmount: booking.deposit_amount ?? "",
    internalNotes: booking.internal_notes ?? "",
    contactName: booking.contact_name ?? "",
    email: booking.email ?? "",
    phone: booking.phone ?? "",
    eventDate: booking.event_date ?? "",
    eventType: booking.event_type ?? "",
    guestCount: booking.guest_count ?? "",
    startTime: booking.start_time ?? "",
    estimate: booking.estimate != null ? String(booking.estimate) : "",
    notes: booking.notes ?? "",
  };

  const [f, setF] = useState(init);
  const [editDetails, setEditDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof f, v: string | boolean) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const m = meta(f.status);
  const pkgName = dash(booking.package_name ?? booking.package);
  const estDisplay = f.estimate
    ? `$${Number(f.estimate).toLocaleString("en-US")}`
    : "—";
  const depositDisplay = f.depositPaid
    ? `Paid${f.depositAmount.trim() ? ` · ${f.depositAmount}` : ""}`
    : f.depositAmount.trim()
      ? `${f.depositAmount} due`
      : "—";

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      setSaved(true);
      setEditDetails(false);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setF((prev) => ({
      ...prev,
      contactName: init.contactName,
      email: init.email,
      phone: init.phone,
      eventDate: init.eventDate,
      eventType: init.eventType,
      guestCount: init.guestCount,
      startTime: init.startTime,
      estimate: init.estimate,
      notes: init.notes,
    }));
    setEditDetails(false);
    setError("");
  }

  async function del() {
    if (!window.confirm("Delete this booking permanently? This can't be undone."))
      return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete.");
        setDeleting(false);
        return;
      }
      router.push("/cocina/bookings");
    } catch {
      setError("Could not delete. Check your connection and try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <p className="muted">
        <Link href="/cocina/bookings">← All bookings</Link>
      </p>

      {/* Summary header */}
      <div className="bk-summary" style={{ borderLeftColor: m.accent }}>
        <div className="bk-summary-top">
          <div>
            <h1 className="bk-name">{f.contactName || "Booking"}</h1>
            <p className="bk-sub">
              {pkgName} · requested {fmt(booking.created_at)}
            </p>
            <span className={`bk-pill bk-st-${f.status} bk-pill-lg`}>
              {m.label}
            </span>
          </div>
          <div className="bk-quick">
            {f.email ? <a href={`mailto:${f.email}`}>✉︎ Email</a> : null}
            {f.phone ? <a href={`tel:${f.phone}`}>📞 Call</a> : null}
          </div>
        </div>
        <div className="bk-facts">
          <div className="bk-fact">
            <div className="l">Event date</div>
            <div className="v">{dash(f.eventDate)}</div>
          </div>
          <div className="bk-fact">
            <div className="l">Guests</div>
            <div className="v">{dash(f.guestCount)}</div>
          </div>
          <div className="bk-fact">
            <div className="l">Start time</div>
            <div className="v">{dash(f.startTime)}</div>
          </div>
          <div className="bk-fact">
            <div className="l">Estimate</div>
            <div className="v">{estDisplay}</div>
          </div>
          <div className="bk-fact">
            <div className="l">Deposit</div>
            <div className="v">{depositDisplay}</div>
          </div>
        </div>
      </div>

      <div className="bk-layout">
        {/* LEFT — workspace */}
        <div className="bk-main">
          <div className="panel compose">
            <h2>Manage</h2>
            <div className="bk-grid">
              <div className="field-c">
                <label>Status</label>
                <select
                  value={f.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-c">
                <label>Follow up by</label>
                <input
                  type="date"
                  value={f.followUpDate}
                  onChange={(e) => set("followUpDate", e.target.value)}
                />
              </div>
              <div className="field-c">
                <label>Deposit amount</label>
                <input
                  type="text"
                  placeholder="e.g. $500"
                  value={f.depositAmount}
                  onChange={(e) => set("depositAmount", e.target.value)}
                />
              </div>
              <div className="field-c">
                <label>Deposit status</label>
                <label className={`bk-toggle${f.depositPaid ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={f.depositPaid}
                    onChange={(e) => set("depositPaid", e.target.checked)}
                  />
                  {f.depositPaid ? "Paid" : "Not paid"}
                </label>
              </div>
            </div>
            <div className="field-c">
              <label>Internal notes — staff only, never shown to the guest</label>
              <textarea
                rows={4}
                placeholder="Call notes, what was promised, special requests, who's handling it…"
                value={f.internalNotes}
                onChange={(e) => set("internalNotes", e.target.value)}
              />
            </div>
            <div className="bk-actions">
              <button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              {saved ? <span className="bk-saved">Saved ✓</span> : null}
              {error ? <span className="bk-err">{error}</span> : null}
            </div>
          </div>

          <div className="panel compose">
            <div className="bk-head">
              <h2>Guest details</h2>
              {!editDetails ? (
                <button className="ghost" onClick={() => setEditDetails(true)}>
                  Edit details
                </button>
              ) : (
                <span className="bk-headbtns">
                  <button onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button className="ghost" onClick={cancelEdit}>
                    Cancel
                  </button>
                </span>
              )}
            </div>

            {editDetails ? (
              <>
                <div className="bk-grid">
                  <div className="field-c">
                    <label>Name</label>
                    <input
                      value={f.contactName}
                      onChange={(e) => set("contactName", e.target.value)}
                    />
                  </div>
                  <div className="field-c">
                    <label>Email</label>
                    <input
                      value={f.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </div>
                  <div className="field-c">
                    <label>Phone</label>
                    <input
                      value={f.phone}
                      onChange={(e) => set("phone", e.target.value)}
                    />
                  </div>
                  <div className="field-c">
                    <label>Event date</label>
                    <input
                      type="date"
                      value={f.eventDate}
                      onChange={(e) => set("eventDate", e.target.value)}
                    />
                  </div>
                  <div className="field-c">
                    <label>Event type</label>
                    <input
                      value={f.eventType}
                      onChange={(e) => set("eventType", e.target.value)}
                    />
                  </div>
                  <div className="field-c">
                    <label>Guests</label>
                    <input
                      value={f.guestCount}
                      onChange={(e) => set("guestCount", e.target.value)}
                    />
                  </div>
                  <div className="field-c">
                    <label>Start time</label>
                    <input
                      value={f.startTime}
                      onChange={(e) => set("startTime", e.target.value)}
                    />
                  </div>
                  <div className="field-c">
                    <label>Estimate ($)</label>
                    <input
                      type="number"
                      value={f.estimate}
                      onChange={(e) => set("estimate", e.target.value)}
                    />
                  </div>
                </div>
                <div className="field-c">
                  <label>Guest notes</label>
                  <textarea
                    rows={2}
                    value={f.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="dl">
                <KV label="Email">
                  {f.email ? <a href={`mailto:${f.email}`}>{f.email}</a> : "—"}
                </KV>
                <KV label="Phone">
                  {f.phone ? <a href={`tel:${f.phone}`}>{f.phone}</a> : "—"}
                </KV>
                <KV label="Event date">{dash(f.eventDate)}</KV>
                <KV label="Event type">{dash(f.eventType)}</KV>
                <KV label="Guests">{dash(f.guestCount)}</KV>
                <KV label="Start time">{dash(f.startTime)}</KV>
                <KV label="Estimate">{estDisplay}</KV>
                <KV label="Guest notes" wide>
                  {dash(f.notes)}
                </KV>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — reference + danger */}
        <div className="bk-side">
          <div className="panel">
            <h2>Menu &amp; selections</h2>
            <div className="dl">
              <KV label="Package" wide>
                {pkgName}
              </KV>
              <KV label="List price">{dash(booking.price)}</KV>
              <KV label="Service style">{dash(booking.service_style)}</KV>
              <KV label="Bar">{dash(booking.bar_type)}</KV>
              <KV label="Tortillas">{dash(booking.tortillas)}</KV>
              <KV label="Proteins" wide>
                {list(booking.proteins)}
              </KV>
              <KV label="Beers" wide>
                {list(booking.beers)}
              </KV>
              <KV label="Agreed to deposit & policies" wide>
                {booking.policy_ack ? "Yes" : "No"}
              </KV>
            </div>
          </div>

          <div className="panel">
            <h2>Record</h2>
            <div className="dl">
              <KV label="Source">{booking.source}</KV>
              <KV label="Notification email">
                {booking.emailed ? "Sent to the restaurant" : "Not sent"}
              </KV>
              <KV label="Received" wide>
                {fmt(booking.created_at)}
              </KV>
            </div>
          </div>

          <div className="panel bk-danger-panel">
            <h2>Delete</h2>
            <p className="muted">
              Removes this request permanently. This can&apos;t be undone.
            </p>
            <button className="bk-danger" onClick={del} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete booking"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
