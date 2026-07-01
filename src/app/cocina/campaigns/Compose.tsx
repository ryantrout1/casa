"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Editor, { type EditorHandle } from "./Editor";
import {
  ALL_CHANNELS,
  CHANNEL_LABEL,
  resultEntries,
  type ChannelId,
  type PublishResults,
} from "@/lib/publish";
import {
  phoenixLocalToUtcISO,
  utcToPhoenixLocalInput,
  type DraftFlyer,
} from "@/lib/schedule";

type InitialDraft = {
  id: string;
  subject: string;
  body: string;
  channels: ChannelId[];
  flyer: DraftFlyer;
  status?: string;
  scheduledFor?: string | null;
};

// A stored UTC timestamp, shown as Arizona wall-clock time.
function fmtPhoenix(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Phoenix",
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function channelsRecord(list: ChannelId[] | undefined): Record<ChannelId, boolean> {
  if (!list) return { email: true, hero: true, grid: true, fiestas_page: true };
  return {
    email: list.includes("email"),
    hero: list.includes("hero"),
    grid: list.includes("grid"),
    fiestas_page: list.includes("fiestas_page"),
  };
}

export default function Compose({
  subscriberCount,
  defaultTestEmail,
  initialDraft,
}: {
  subscriberCount: number;
  defaultTestEmail: string;
  initialDraft?: InitialDraft;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [testEmail, setTestEmail] = useState(defaultTestEmail);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const editorRef = useRef<EditorHandle>(null);

  // Fiesta flyer (drives the website surfaces).
  const flyerFileRef = useRef<HTMLInputElement>(null);
  const [flyerUrl, setFlyerUrl] = useState(initialDraft?.flyer.imageUrl ?? "");
  const [flyerCaption, setFlyerCaption] = useState(initialDraft?.flyer.caption ?? "");
  const [flyerDate, setFlyerDate] = useState(initialDraft?.flyer.eventDate ?? "");
  const [flyerAlt, setFlyerAlt] = useState(initialDraft?.flyer.alt ?? "");
  const [flyerUploading, setFlyerUploading] = useState(false);

  // Destinations. Default to the full fan-out; email locks after it sends.
  const [channels, setChannels] = useState<Record<ChannelId, boolean>>(
    channelsRecord(initialDraft?.channels),
  );
  const [emailSent, setEmailSent] = useState(false);
  const [results, setResults] = useState<PublishResults | null>(null);
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);

  // Scheduling (Arizona wall-clock in the input; UTC on the wire).
  const isScheduled = initialDraft?.status === "scheduled";
  const [scheduleLocal, setScheduleLocal] = useState(
    initialDraft?.scheduledFor ? utcToPhoenixLocalInput(initialDraft.scheduledFor) : "",
  );

  function toggle(key: ChannelId) {
    setChannels((c) => ({ ...c, [key]: !c[key] }));
  }

  function flyerPayload() {
    return {
      imageUrl: flyerUrl,
      caption: flyerCaption,
      alt: flyerAlt,
      eventDate: flyerDate || undefined,
    };
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

  async function saveDraft() {
    const html = editorRef.current?.getHTML() ?? "";
    const selected = (Object.keys(channels) as ChannelId[]).filter((k) => channels[k]);
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: draftId ? "update_draft" : "save_draft",
          id: draftId ?? undefined,
          subject,
          html,
          flyer: flyerPayload(),
          channels: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Couldn't save draft.");
        return;
      }
      setDraftId(data.id);
      setMsg("Draft saved.");
      router.refresh();
    } catch {
      setErr(true);
      setMsg("Couldn't save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft() {
    if (!draftId) return;
    if (!window.confirm("Delete this draft? This can't be undone.")) return;
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: draftId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(true);
        setMsg(d?.error ?? "Couldn't delete draft.");
        setBusy(false);
        return;
      }
      window.location.assign("/cocina/campaigns");
    } catch {
      setErr(true);
      setMsg("Couldn't delete draft.");
      setBusy(false);
    }
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
          flyer: flyerPayload(),
          channels: selected,
          draftId: draftId ?? undefined,
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
      // On a clean publish, land on a fresh campaigns page (the draft, if any, is
      // retired server-side). On any failure, keep the results panel up to read.
      if (data.ok) setTimeout(() => window.location.assign("/cocina/campaigns"), 4000);
    } catch {
      setErr(true);
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    const html = editorRef.current?.getHTML() ?? "";
    const selected = (Object.keys(channels) as ChannelId[]).filter((k) => channels[k]);
    const utc = phoenixLocalToUtcISO(scheduleLocal);
    if (!utc) {
      setErr(true);
      setMsg("Pick a valid Arizona date and time to schedule.");
      return;
    }
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          id: draftId ?? undefined,
          subject,
          html,
          flyer: flyerPayload(),
          channels: selected,
          scheduledFor: utc,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Couldn't schedule.");
        setBusy(false);
        return;
      }
      window.location.assign("/cocina/campaigns");
    } catch {
      setErr(true);
      setMsg("Couldn't schedule.");
      setBusy(false);
    }
  }

  async function cancelSchedule() {
    if (!draftId) return;
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_schedule", id: draftId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(true);
        setMsg(d?.error ?? "Couldn't cancel the schedule.");
        setBusy(false);
        return;
      }
      window.location.assign("/cocina/campaigns");
    } catch {
      setErr(true);
      setMsg("Couldn't cancel the schedule.");
      setBusy(false);
    }
  }

  const anyBusy = busy || uploading || flyerUploading;

  return (
    <div className="panel compose">
      {draftId ? (
        <div className="field-c" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="pill">{isScheduled ? "Scheduled" : "Draft"}</span>
          {isScheduled && initialDraft?.scheduledFor ? (
            <>
              <span>
                Scheduled for <strong>{fmtPhoenix(initialDraft.scheduledFor)}</strong> (Arizona time)
              </span>
              <button className="ghost" disabled={anyBusy} onClick={cancelSchedule}>
                Cancel schedule
              </button>
            </>
          ) : (
            <span className="muted">
              Editing a saved draft. <a href="/cocina/campaigns">Start a new campaign</a>
            </span>
          )}
        </div>
      ) : null}

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
        <Editor ref={editorRef} onUploadingChange={setUploading} initialHTML={initialDraft?.body} />
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

      <div className="field-c test-row">
        <label>Schedule for (Arizona time)</label>
        <input
          type="datetime-local"
          value={scheduleLocal}
          onChange={(e) => setScheduleLocal(e.target.value)}
        />
        <button className="ghost" disabled={anyBusy || !scheduleLocal} onClick={schedule}>
          {isScheduled ? "Reschedule" : "Schedule"}
        </button>
      </div>

      <div className="send-row" style={{ gap: 10, flexWrap: "wrap" }}>
        <button disabled={anyBusy} onClick={publish}>
          {busy ? "Working…" : draftId ? "Send now" : "Publish"}
        </button>
        {!isScheduled ? (
          <button className="ghost" disabled={anyBusy} onClick={saveDraft}>
            {draftId ? "Update draft" : "Save draft"}
          </button>
        ) : null}
        {draftId ? (
          <button className="ghost" disabled={anyBusy} onClick={deleteDraft} style={{ color: "#c0392b" }}>
            {isScheduled ? "Delete" : "Delete draft"}
          </button>
        ) : null}
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
