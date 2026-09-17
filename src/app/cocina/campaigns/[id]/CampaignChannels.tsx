"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHANNEL_LABEL, type ChannelId } from "@/lib/publish";

// Where this campaign is right now, and the two things you do about it: turn a
// website surface off (or back on), and run the whole campaign again.
//
// Surfaces are flags on the flyer this campaign published, so they are toggled
// through the same /api/admin/fiestas route the Website page uses. Nothing
// here can send an email.

type Surface = { id: ChannelId; on: boolean };

export default function CampaignChannels({
  campaignId,
  fiestaId,
  surfaces,
  emailLine,
}: {
  campaignId: string;
  fiestaId: string | null;
  surfaces: Surface[];
  emailLine: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(surfaces.map((s) => [s.id, s.on])),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function toggle(surface: ChannelId) {
    if (!fiestaId) return;
    const next = !state[surface];
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/fiestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id: fiestaId, surface, value: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d?.error ?? "Update failed.");
        return;
      }
      setState((s) => ({ ...s, [surface]: next }));
    } catch {
      setErr("Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", id: campaignId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.id) {
        setErr(d?.error ?? "Couldn't duplicate this campaign.");
        setBusy(false);
        return;
      }
      router.push(`/cocina/campaigns/new?draft=${d.id}`);
    } catch {
      setErr("Couldn't duplicate this campaign.");
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Where it is right now</h2>
      {err ? <p style={{ color: "#c0392b" }}>{err}</p> : null}
      {fiestaId ? (
        <table className="t" style={{ marginBottom: 12 }}>
          <tbody>
            {surfaces.map((s) => (
              <tr key={s.id}>
                <td style={{ width: 200 }}>
                  <strong>{CHANNEL_LABEL[s.id]}</strong>
                </td>
                <td style={{ width: 110 }}>
                  <span className={state[s.id] ? "pill good" : "pill"}>
                    {state[s.id] ? "Showing" : "Off"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="pill"
                    disabled={busy}
                    onClick={() => toggle(s.id)}
                    style={{ cursor: "pointer", border: "1px solid #cfd3da", minHeight: 32 }}
                  >
                    {state[s.id] ? "Take down" : "Put back"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">This campaign has no flyer on the website.</p>
      )}
      <p className="lede" style={{ marginTop: 0 }}>{emailLine}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="pill good"
          disabled={busy}
          onClick={duplicate}
          style={{ cursor: "pointer", border: "none", minHeight: 36, padding: "8px 14px" }}
        >
          Duplicate for the next event
        </button>
        {fiestaId ? (
          <a href="/cocina/website" className="pill" style={{ minHeight: 36, padding: "8px 14px" }}>
            Edit the flyer and hero copy
          </a>
        ) : null}
      </div>
    </div>
  );
}
