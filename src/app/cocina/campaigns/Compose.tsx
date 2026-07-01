"use client";

import { useRef, useState } from "react";
import Editor, { type EditorHandle } from "./Editor";
import {
  ALL_CHANNELS,
  CHANNEL_LABEL,
  resultEntries,
  type ChannelId,
  type PublishResults,
} from "@/lib/publish";

export default function Compose({
  subscriberCount,
  defaultTestEmail,
}: {
  subscriberCount: number;
  defaultTestEmail: string;
}) {
  const [subject, setSubject] = useState("");
  const [testEmail, setTestEmail] = useState(defaultTestEmail);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const editorRef = useRef<EditorHandle>(null);

  // Fiesta flyer (drives the website surfaces).
  const flyerFileRef = useRef<HTMLInputElement>(null);
  const [flyerUrl, setFlyerUrl] = useState("");
  const [flyerCaption, setFlyerCaption] = useState("");
  const [flyerDate, setFlyerDate] = useState("");
  const [flyerAlt, setFlyerAlt] = useState("");
  const [flyerUploading, setFlyerUploading] = useState(false);

  // Destinations. Default to the full fan-out; email locks after it sends.
  const [channels, setChannels] = useState<Record<ChannelId, boolean>>({
    email: true,
    hero: true,
    grid: true,
    fiestas_page: true,
  });
  const [emailSent, setEmailSent] = useState(false);
  const [results, setResults] = useState<PublishResults | null>(null);

  function toggle(key: ChannelId) {
    setChannels((c) => ({ ...c, [key]: !c[key] }));
  }

  async function onPickFlyer(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErr(true);
      setMsg("The flyer must be an image.");
    } else if (f.size > 4_000_000) {
      setErr(true);
      setMsg("Flyer is over ~4MB — use a smaller/compressed version.");
    } else {
      setFlyerUploading(true);
      setMsg("");
      setErr(false);
      try {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setErr(true);
          setMsg(data?.error ?? "Flyer upload failed.");
        } else {
          setFlyerUrl(data.url);
        }
      } catch {
        setErr(true);
        setMsg("Flyer upload failed.");
      } finally {
        setFlyerUploading(false);
      }
    }
    if (flyerFileRef.current) flyerFileRef.current.value = "";
  }

  async function sendTest() {
    const html = editorRef.current?.getHTML() ?? "";
    if (!subject.trim() || editorRef.current?.isEmpty()) {
      setErr(true);
      setMsg("Add a subject and a message before sending a test.");
      return;
    }
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", subject, html, testEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Test failed.");
      } else {
        setMsg(`Test sent to ${testEmail}. Check your inbox.`);
      }
    } catch {
      setErr(true);
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    const html = editorRef.current?.getHTML() ?? "";
    const selected = (Object.keys(channels) as ChannelId[]).filter(
      (k) => channels[k] && !(k === "email" && emailSent),
    );
    if (selected.length === 0) {
      setErr(true);
      setMsg("Pick at least one destination.");
      return;
    }
    if (
      selected.includes("email") &&
      !window.confirm(`Email this to all ${subscriberCount} subscribers? This can't be undone.`)
    ) {
      return;
    }
    setBusy(true);
    setMsg("");
    setErr(false);
    setResults(null);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          subject,
          html,
          flyer: {
            imageUrl: flyerUrl,
            caption: flyerCaption,
            alt: flyerAlt,
            eventDate: flyerDate || undefined,
          },
          channels: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Publish failed.");
        return;
      }
      setResults(data.results as PublishResults);
      if (data.results?.email?.status === "ok") {
        setEmailSent(true);
        setChannels((c) => ({ ...c, email: false }));
      }
      // On a clean publish, refresh so the new send appears in Recent sends.
      // On any failure, keep the results panel up so it can be read.
      if (data.ok) setTimeout(() => window.location.reload(), 4000);
    } catch {
      setErr(true);
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const anyBusy = busy || uploading || flyerUploading;

  return (
    <div className="panel compose">
      <div className="field-c">
        <label>Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Taco Tuesday is back — $2 tacos all night"
        />
      </div>

      <div className="field-c">
        <label>Email message</label>
        <Editor ref={editorRef} onUploadingChange={setUploading} />
        <p className="hint">
          Casa header, footer, and an unsubscribe link are added automatically. Only used when{" "}
          <strong>Email</strong> is a destination below.
        </p>
      </div>

      <div className="field-c">
        <label>Fiesta flyer (for the website)</label>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <button
              type="button"
              className="ghost"
              disabled={flyerUploading}
              onClick={() => flyerFileRef.current?.click()}
            >
              {flyerUploading ? "Uploading…" : flyerUrl ? "Replace flyer" : "Upload flyer"}
            </button>
            <input
              ref={flyerFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onPickFlyer}
            />
          </div>
          {flyerUrl ? (
            <img
              src={flyerUrl}
              alt="Flyer preview"
              style={{ width: 120, height: "auto", borderRadius: 8, border: "1px solid #eee" }}
            />
          ) : null}
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 10, maxWidth: 520 }}>
          <input
            type="text"
            value={flyerCaption}
            onChange={(e) => setFlyerCaption(e.target.value)}
            placeholder="Caption (shown on the Fiestas page) — e.g. México vs USA · July 4"
          />
          <input
            type="text"
            value={flyerAlt}
            onChange={(e) => setFlyerAlt(e.target.value)}
            placeholder="Alt text (describe the flyer for accessibility)"
          />
          <label className="hint" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Event date (optional — leave blank for recurring/ongoing)
            <input type="date" value={flyerDate} onChange={(e) => setFlyerDate(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="field-c">
        <label>Publish to</label>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {ALL_CHANNELS.map((c) => {
            const locked = c === "email" && emailSent;
            return (
              <label
                key={c}
                style={{ display: "flex", gap: 6, alignItems: "center", opacity: locked ? 0.55 : 1 }}
              >
                <input
                  type="checkbox"
                  checked={channels[c] && !locked}
                  disabled={locked}
                  onChange={() => toggle(c)}
                />
                {CHANNEL_LABEL[c]}
                {locked ? <span className="hint"> (already sent)</span> : null}
              </label>
            );
          })}
        </div>
      </div>

      <div className="field-c test-row">
        <label>Send a test to</label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button className="ghost" disabled={anyBusy} onClick={sendTest}>
          Send test
        </button>
      </div>

      <div className="send-row">
        <button disabled={anyBusy} onClick={publish}>
          {busy ? "Publishing…" : "Publish"}
        </button>
        {msg ? <span className={err ? "send-msg err" : "send-msg ok"}>{msg}</span> : null}
      </div>

      {results ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <strong>Publish results</strong>
          <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
            {resultEntries(results).map((e) => (
              <li key={e.channel} style={{ padding: "3px 0" }}>
                <span style={{ color: e.ok ? "#16a89e" : "#c0392b", fontWeight: 700 }}>
                  {e.ok ? "✓" : "✗"}
                </span>{" "}
                {e.label}
                {e.detail ? <span className="muted"> — {e.detail}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
