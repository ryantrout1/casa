"use client";

import { useState } from "react";

type Form = { name: string; email: string; phone: string; birthday: string };

export default function RewardsForm() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<Form>({
    name: "",
    email: "",
    phone: "",
    birthday: "",
  });

  function update(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: connect to CRM. The sign-up payload (name/email/phone/birthday)
    // should be posted to whichever platform is live at launch
    // (GoHighLevel now, HubSpot later). No backend is wired yet, so this
    // currently just confirms on the client.
    setDone(true);
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
          <label htmlFor="rw-phone">Phone</label>
          <input
            id="rw-phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={update}
            autoComplete="tel"
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
      <button type="submit">Join Casa Rewards</button>
      <div className="fine">
        Free to join. We&apos;ll use your email for rewards and the occasional
        members-only special — no spam, unsubscribe anytime.
      </div>
    </form>
  );
}
