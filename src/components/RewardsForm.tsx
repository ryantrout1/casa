"use client";

import { useState } from "react";

type Form = {
  name: string;
  email: string;
  phone: string;
  birthday: string;
  smsConsent: boolean;
};

export default function RewardsForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Form>({
    name: "",
    email: "",
    phone: "",
    birthday: "",
    smsConsent: false,
  });

  function update(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="joincard">
        <div className="ok">
          <div className="big">¡Bienvenido a la familia!</div>
          <p>
            You&apos;re in. Your free chips &amp; queso are waiting on your next
            visit — just show your email or phone at the table.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="joincard" onSubmit={submit}>
      <div className="field">
        <label htmlFor="rw-name">Name</label>
        <input
          id="rw-name"
          name="name"
          type="text"
          value={form.name}
          onChange={update}
          required
          autoComplete="name"
        />
      </div>
      <div className="field">
        <label htmlFor="rw-email">Email</label>
        <input
          id="rw-email"
          name="email"
          type="email"
          value={form.email}
          onChange={update}
          required
          autoComplete="email"
        />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="rw-phone">
            Mobile phone{form.smsConsent ? "" : " (optional)"}
          </label>
          <input
            id="rw-phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={update}
            autoComplete="tel"
            required={form.smsConsent}
          />
        </div>
        <div className="field">
          <label htmlFor="rw-bday">Birthday (MM/DD)</label>
          <input
            id="rw-bday"
            name="birthday"
            type="text"
            placeholder="08/15"
            value={form.birthday}
            onChange={update}
          />
        </div>
      </div>

      <label className="rw-consent" htmlFor="rw-sms">
        <input
          id="rw-sms"
          name="smsConsent"
          type="checkbox"
          checked={form.smsConsent}
          onChange={update}
        />
        <span>Yes! Text me Casa Rewards offers and updates.</span>
      </label>
      <p className="consent-fine">
        By checking this box, you agree to receive recurring automated marketing
        and informational text messages (e.g. offers, events, and rewards) from
        Casa de Leyva at the mobile number provided. Consent is not a condition
        of any purchase. Message frequency varies. Msg &amp; data rates may
        apply. Reply HELP for help, STOP to cancel. See our{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="/terms#sms" target="_blank" rel="noopener noreferrer">
          SMS Terms
        </a>
        .
      </p>

      {error ? (
        <p style={{ color: "#c0392b", margin: "8px 0 0" }}>{error}</p>
      ) : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "Joining…" : "Join Casa Rewards"}
      </button>
      <div className="fine">
        Free to join. We&apos;ll use your email for rewards and the occasional
        members-only special — no spam, unsubscribe anytime.
      </div>
    </form>
  );
}
