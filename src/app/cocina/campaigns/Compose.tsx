"use client";

import { useRef, useState } from "react";

export default function Compose({
  subscriberCount,
  defaultTestEmail,
}: {
  subscriberCount: number;
  defaultTestEmail: string;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState(defaultTestEmail);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_000_000) {
      setErr(true);
      setMsg("That image is over ~4MB — try a smaller/compressed version.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    setErr(false);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Upload failed.");
        return;
      }
      setImageUrl(data.url);
    } catch {
      setErr(true);
      setMsg("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    setImageUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function run(action: "test" | "send") {
    if (!subject.trim() || !body.trim()) {
      setErr(true);
      setMsg("Add a subject and a message first.");
      return;
    }
    if (
      action === "send" &&
      !window.confirm(`Send this email to all ${subscriberCount} subscribers? This can't be undone.`)
    ) {
      return;
    }
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, subject, body, testEmail, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Send failed.");
        return;
      }
      if (action === "test") {
        setMsg(`Test sent to ${testEmail}. Check your inbox.`);
      } else {
        setMsg(`Sent to ${data.sent} member${data.sent === 1 ? "" : "s"}.`);
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch {
      setErr(true);
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

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
        <label>Message</label>
        <textarea
          rows={9}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"Hola!\n\nWrite your message here. Leave a blank line between paragraphs.\n\n— The Casa de Leyva family"}
        />
        <p className="hint">Plain text. Blank line = new paragraph. Casa header, footer, and unsubscribe link are added automatically.</p>
      </div>

      <div className="field-c">
        <label>Flyer image (optional)</label>
        {imageUrl ? (
          <div className="img-preview">
            <img src={imageUrl} alt="flyer preview" />
            <button type="button" className="ghost" onClick={removeImage}>
              Remove
            </button>
          </div>
        ) : (
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} disabled={uploading} />
        )}
        <p className="hint">
          {uploading ? "Uploading…" : "Appears below your text, like your flyer emails. Max ~4MB."}
        </p>
      </div>

      <div className="field-c test-row">
        <label>Send a test to</label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button className="ghost" disabled={busy || uploading} onClick={() => run("test")}>
          Send test
        </button>
      </div>

      <div className="send-row">
        <button disabled={busy || uploading} onClick={() => run("send")}>
          {busy ? "Sending…" : `Send to all ${subscriberCount} subscribers`}
        </button>
        {msg ? <span className={err ? "send-msg err" : "send-msg ok"}>{msg}</span> : null}
      </div>
    </div>
  );
}
