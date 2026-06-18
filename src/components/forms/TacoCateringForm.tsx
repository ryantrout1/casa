"use client";

import { useState } from "react";

type Form = {
  contactName: string;
  email: string;
  phone: string;
  eventDate: string;
  eventType: string;
  guestCount: string;
  startTime: string;
  proteins: string[];
  tortillas: string;
  foodNotes: string;
  barType: string;
  beers: string[];
  policyAck: boolean;
};

const PROTEINS = ["Carne Asada", "Pollo Asado", "Al Pastor"];
const BEERS = ["Pacifico", "Michelob Ultra", "Dos XX", "Coors", "Modelo"];

export default function TacoCateringForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Form>({
    contactName: "",
    email: "",
    phone: "",
    eventDate: "",
    eventType: "",
    guestCount: "",
    startTime: "",
    proteins: [],
    tortillas: "Corn",
    foodNotes: "",
    barType: "Hosted",
    beers: [],
    policyAck: false,
  });

  function update(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function toggle(field: "proteins" | "beers", value: string, max: number) {
    setForm((f) => {
      const has = f[field].includes(value);
      if (has) return { ...f, [field]: f[field].filter((v) => v !== value) };
      if (f[field].length >= max) return f;
      return { ...f, [field]: [...f[field], value] };
    });
  }

  const guests = parseInt(form.guestCount, 10);
  const estimate =
    guests && guests > 0 ? Math.round((guests * 18 + 150) * 1.2) : null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.proteins.length < 2) {
      setError("Please pick at least 2 proteins.");
      return;
    }
    if (!form.policyAck) {
      setError("Please confirm you agree to the deposit & policies.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: "taco-catering",
          packageName: "Taco Catering Package",
          estimate,
          ...form,
          notes: form.foodNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — please call us at 623-306-2386.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong — please call us at 623-306-2386.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="joincard">
        <div className="ok">
          <div className="big">¡Gracias! Request received</div>
          <p>
            We&apos;ve got your taco catering request for{" "}
            {form.eventDate || "your event"}. We&apos;ll call{" "}
            {form.phone || "you"} to confirm your date, finalize the menu, and
            arrange the 50% deposit that reserves it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="joincard" onSubmit={submit}>
      <div className="bk-sec">Your details</div>
      <div className="field">
        <label htmlFor="bk-name">Contact name</label>
        <input
          id="bk-name"
          name="contactName"
          type="text"
          value={form.contactName}
          onChange={update}
          required
          autoComplete="name"
        />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="bk-email">Email</label>
          <input
            id="bk-email"
            name="email"
            type="email"
            value={form.email}
            onChange={update}
            required
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="bk-phone">Phone</label>
          <input
            id="bk-phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={update}
            required
            autoComplete="tel"
          />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="bk-date">Event date</label>
          <input
            id="bk-date"
            name="eventDate"
            type="date"
            value={form.eventDate}
            onChange={update}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="bk-type">Event type</label>
          <input
            id="bk-type"
            name="eventType"
            type="text"
            placeholder="Birthday, work lunch…"
            value={form.eventType}
            onChange={update}
          />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="bk-guests">Guest count (20–40)</label>
          <input
            id="bk-guests"
            name="guestCount"
            type="number"
            min={20}
            max={40}
            placeholder="20–40"
            value={form.guestCount}
            onChange={update}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="bk-time">Preferred start time</label>
          <input
            id="bk-time"
            name="startTime"
            type="time"
            value={form.startTime}
            onChange={update}
            required
          />
        </div>
      </div>

      <div className="bk-sec">Your tacos</div>
      <label>Choose your proteins — pick 2 or 3 ({form.proteins.length} selected)</label>
      <div className="bk-pills">
        {PROTEINS.map((p) => (
          <label
            key={p}
            className={`bk-pill${form.proteins.includes(p) ? " on" : ""}`}
          >
            <input
              type="checkbox"
              checked={form.proteins.includes(p)}
              onChange={() => toggle("proteins", p, 3)}
            />
            {p}
          </label>
        ))}
      </div>
      <label>Tortillas</label>
      <div className="bk-radios">
        {["Corn", "Flour", "Both"].map((t) => (
          <label key={t}>
            <input
              type="radio"
              name="tortillas"
              value={t}
              checked={form.tortillas === t}
              onChange={update}
            />
            {t}
          </label>
        ))}
      </div>
      <div className="bk-info">
        Included: Spanish rice &amp; refried beans · garnish bar (onion,
        cilantro, lime, salsa roja, salsa verde)
      </div>
      <div className="field">
        <label htmlFor="bk-notes">Additional food notes</label>
        <textarea
          id="bk-notes"
          name="foodNotes"
          rows={2}
          placeholder="Allergies, kids' portions, anything else…"
          value={form.foodNotes}
          onChange={update}
        />
      </div>

      <div className="bk-sec">Bar service</div>
      <div className="bk-radios col">
        {[
          ["Hosted", "Hosted bar (you pre-pay)"],
          ["Cash", "Cash bar (guests pay)"],
          ["None", "No bar service"],
        ].map(([val, label]) => (
          <label key={val}>
            <input
              type="radio"
              name="barType"
              value={val}
              checked={form.barType === val}
              onChange={update}
            />
            {label}
          </label>
        ))}
      </div>
      {form.barType !== "None" && (
        <>
          <label>Tap beer — pick up to 3 ({form.beers.length} selected)</label>
          <div className="bk-pills">
            {BEERS.map((b) => (
              <label
                key={b}
                className={`bk-pill${form.beers.includes(b) ? " on" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={form.beers.includes(b)}
                  onChange={() => toggle("beers", b, 3)}
                />
                {b}
              </label>
            ))}
          </div>
        </>
      )}
      <div className="bk-finehint">
        Strictly 21+ with valid ID. No outside alcohol or soda permitted (AZ
        Title 4).
      </div>

      <div className="bk-sec">Before you send</div>
      <div className="bk-policy">
        3-hour slot in our dedicated catering area · $150 privacy/setup fee · 20%
        service &amp; production fee · 50% non-refundable deposit reserves your
        date · balance due 30 days prior · no glitter, confetti or wall-damaging
        decor ($300 cleaning fee)
      </div>
      <div className="bk-est">
        <span>
          Estimate <em>— final quote confirmed with you</em>
        </span>
        <b>{estimate ? `$${estimate.toLocaleString()}` : "—"}</b>
      </div>
      <label className="bk-ack" htmlFor="bk-ack">
        <input
          id="bk-ack"
          name="policyAck"
          type="checkbox"
          checked={form.policyAck}
          onChange={update}
        />
        <span>I&apos;ve read and agree to the deposit &amp; policies above.</span>
      </label>

      {error ? <div className="bk-err">{error}</div> : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Request my date"}
      </button>
      <div className="fine">
        We&apos;ll follow up by phone to confirm your date, menu, and deposit.
      </div>
    </form>
  );
}
