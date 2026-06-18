"use client";

import { useState } from "react";

type Menu = "grazing" | "buffet" | "dual";
type Bar = "cash" | "hostedBeer" | "openBar";

type Tier = {
  name: string;
  price: string;
  blurb: string;
  heroClass: string;
  included: string[];
  menu: Menu;
  bar: Bar;
};

export const TIERS: Record<string, Tier> = {
  social: {
    name: "The Social Collection",
    price: "$5,500",
    blurb: "Ideal for intimate celebrations, mixers & birthdays",
    heroClass: "t-teal",
    menu: "grazing",
    bar: "cash",
    included: [
      "4 hours of private facility use",
      "Signature appetizer grazing table — mini street tacos, elote cups, taquitos, chips, guacamole & house salsas",
      "Unlimited soda, water & two signature aguas frescas",
      "Cash bar for margaritas & tap beers",
      "House linens, 1 security guard, full setup & cleanup, cake cutting",
    ],
  },
  tradicion: {
    name: "The Tradición Collection",
    price: "$9,200",
    blurb: "Perfect for anniversaries & graduations",
    heroClass: "t-mag",
    menu: "buffet",
    bar: "hostedBeer",
    included: [
      "6 hours of private facility use",
      "Full Mexican buffet — choice of 2 proteins, rice, beans & tortillas",
      "Unlimited soda, water & aguas frescas",
      "4-hour hosted beer bar — Pacifico, Michelob Ultra, Dos XX, Coors & Modelo (liquor available for purchase)",
      "Event DJ & MC with dance-floor lighting",
      "Upgraded linens & runners, 1 security guard, 2 event servers, cake cutting",
    ],
  },
  "leyva-grand": {
    name: "The Leyva Grand Collection",
    price: "$14,800",
    blurb: "The ultimate experience for weddings & quinceañeras",
    heroClass: "t-purp",
    menu: "dual",
    bar: "openBar",
    included: [
      "6 hours private venue use + 2 hours early setup access",
      "Dual service — grazing appetizer table plus full buffet or plated dinner",
      "Midnight street tacos from the Casa de Leyva food truck",
      "Unlimited soda, water & aguas frescas",
      "4-hour full hosted open bar — house spirits, signature margaritas & all draft beers",
      "Floral centerpieces for every table + sweetheart arrangement",
      "Top-tier DJ/MC & custom photo booth",
      "Day-of coordinator, 2 security guards, 3 event servers",
    ],
  },
};

const PROTEINS = ["Carne Asada", "Pollo Asado", "Al Pastor"];
const BEERS = ["Pacifico", "Michelob Ultra", "Dos XX", "Coors", "Modelo"];

type Form = {
  contactName: string;
  email: string;
  phone: string;
  eventDate: string;
  eventType: string;
  guestCount: string;
  startTime: string;
  serviceStyle: string;
  proteins: string[];
  tortillas: string;
  notes: string;
  beers: string[];
  policyAck: boolean;
};

export default function EventTierForm({ tier }: { tier: string }) {
  const cfg = TIERS[tier];
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
    serviceStyle: "Buffet",
    proteins: [],
    tortillas: "Corn",
    notes: "",
    beers: [],
    policyAck: false,
  });

  const base = Number(cfg.price.replace(/[^0-9]/g, ""));
  const estimate = Math.round(base * 1.2);

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

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cfg.menu !== "grazing" && form.proteins.length !== 2) {
      setError("Please choose exactly 2 proteins for the buffet.");
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
          package: tier,
          packageName: cfg.name,
          price: cfg.price,
          estimate,
          ...form,
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
      <section className="bk-formwrap sec">
        <div className="wrap">
          <div className="joincard">
            <div className="ok">
              <div className="big">¡Gracias! Request received</div>
              <p>
                We&apos;ve got your {cfg.name} request for{" "}
                {form.eventDate || "your event"}. We&apos;ll call{" "}
                {form.phone || "you"} to confirm your date, walk through the
                details, and arrange the 50% deposit that reserves it.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={`bk-hero ${cfg.heroClass} sec`}>
        <div className="wrap">
          <div className="scr">reserva tu fiesta</div>
          <h1 className="pop">{cfg.name}</h1>
          <p>
            {cfg.price} · all-inclusive for up to 100 guests · {cfg.blurb}.
          </p>
        </div>
      </section>

      <section className="bk-formwrap sec">
        <div className="wrap">
          <form className="joincard" onSubmit={submit}>
            <div className="bk-summary">
              <div className="bk-sumhead">What&apos;s included</div>
              <ul>
                {cfg.included.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>

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
                  placeholder="Quinceañera, wedding…"
                  value={form.eventType}
                  onChange={update}
                />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="bk-guests">Guest count</label>
                <input
                  id="bk-guests"
                  name="guestCount"
                  type="number"
                  min={1}
                  placeholder="Up to 100 included"
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

            <div className="bk-sec">Your menu</div>
            {cfg.menu === "grazing" && (
              <div className="bk-info">
                Your grazing table is our signature spread — mini street tacos,
                elote cups, taquitos, chips, guacamole &amp; house salsas. Note
                any allergies below.
              </div>
            )}
            {cfg.menu === "dual" && (
              <>
                <label>Main service style</label>
                <div className="bk-radios col">
                  {["Buffet", "Plated dinner"].map((s) => (
                    <label key={s}>
                      <input
                        type="radio"
                        name="serviceStyle"
                        value={s}
                        checked={form.serviceStyle === s}
                        onChange={update}
                      />
                      {s}
                    </label>
                  ))}
                </div>
                <div className="bk-info">
                  Grazing appetizer table and midnight street tacos from the food
                  truck are included with this package.
                </div>
              </>
            )}
            {(cfg.menu === "buffet" || cfg.menu === "dual") && (
              <>
                <label>
                  Choose your proteins — pick 2 ({form.proteins.length} selected)
                </label>
                <div className="bk-pills">
                  {PROTEINS.map((p) => (
                    <label
                      key={p}
                      className={`bk-pill${
                        form.proteins.includes(p) ? " on" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.proteins.includes(p)}
                        onChange={() => toggle("proteins", p, 2)}
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
                  Buffet includes Spanish rice &amp; refried beans · garnish bar
                  (onion, cilantro, lime, salsa roja, salsa verde)
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="bk-notes">Additional food notes</label>
              <textarea
                id="bk-notes"
                name="notes"
                rows={2}
                placeholder="Allergies, dietary needs, anything else…"
                value={form.notes}
                onChange={update}
              />
            </div>

            <div className="bk-sec">Bar service</div>
            {cfg.bar === "cash" && (
              <div className="bk-info">
                Cash bar — your guests purchase margaritas &amp; tap beers at the
                bar. 21+ with valid ID; no outside beverages permitted (AZ Title
                4).
              </div>
            )}
            {cfg.bar === "openBar" && (
              <div className="bk-info">
                Full hosted open bar for 4 hours — house spirits, signature
                margaritas &amp; all draft beers included. 21+ with valid ID; no
                outside beverages permitted (AZ Title 4).
              </div>
            )}
            {cfg.bar === "hostedBeer" && (
              <>
                <label>
                  4-hour hosted beer bar — pick up to 3 ({form.beers.length}{" "}
                  selected)
                </label>
                <div className="bk-pills">
                  {BEERS.map((b) => (
                    <label
                      key={b}
                      className={`bk-pill${
                        form.beers.includes(b) ? " on" : ""
                      }`}
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
                <div className="bk-finehint">
                  Liquor available for guest purchase. 21+ with valid ID; no
                  outside beverages permitted (AZ Title 4).
                </div>
              </>
            )}

            <div className="bk-sec">Before you send</div>
            <div className="bk-policy">
              20% service &amp; production fee · 50% non-refundable deposit
              reserves your date · balance due 30 days prior · no glitter,
              confetti or wall-damaging decor ($300 cleaning fee)
            </div>
            <div className="bk-est">
              <span>
                {cfg.price} package <em>+ 20% service &amp; production</em>
              </span>
              <b>${estimate.toLocaleString()}</b>
            </div>
            <label className="bk-ack" htmlFor="bk-ack">
              <input
                id="bk-ack"
                name="policyAck"
                type="checkbox"
                checked={form.policyAck}
                onChange={update}
              />
              <span>
                I&apos;ve read and agree to the deposit &amp; policies above.
              </span>
            </label>

            {error ? <div className="bk-err">{error}</div> : null}
            <button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Request my date"}
            </button>
            <div className="fine">
              We&apos;ll follow up by phone to confirm your date, finalize the
              details, and arrange the deposit.
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
