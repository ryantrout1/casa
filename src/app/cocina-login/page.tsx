"use client";

import { useState } from "react";

export default function Login() {
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d?.error ?? "That passcode isn't right.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/cocina") ? next : "/cocina";
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#faf6ee",
        fontFamily: '"Nunito", system-ui, sans-serif',
        padding: "20px",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: "#fff",
          border: "1px solid #e6e8ec",
          borderRadius: "14px",
          padding: "32px",
          width: "100%",
          maxWidth: "360px",
          textAlign: "center",
          boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/email/logo.jpg"
          alt="Casa de Leyva"
          style={{ width: "180px", maxWidth: "70%", height: "auto", margin: "0 auto 18px" }}
        />
        <h1
          style={{
            fontFamily: '"Bangers", system-ui, sans-serif',
            color: "#3B628D",
            fontSize: "1.4rem",
            letterSpacing: "0.5px",
            margin: "0 0 4px",
          }}
        >
          Casa Rewards Admin
        </h1>
        <p style={{ color: "#9aa0ad", fontSize: "0.85rem", margin: "0 0 20px" }}>
          Enter the staff passcode to continue.
        </p>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          autoFocus
          style={{
            width: "100%",
            padding: "11px 12px",
            border: "1px solid #cfd3da",
            borderRadius: "8px",
            fontSize: "1rem",
            marginBottom: "12px",
          }}
        />
        {err ? (
          <p style={{ color: "#c0392b", fontSize: "0.85rem", margin: "0 0 12px" }}>{err}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            background: "#3B628D",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "11px",
            fontSize: "1rem",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
