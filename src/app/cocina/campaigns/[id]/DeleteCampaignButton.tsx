"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCampaignButton({
  id,
  subject,
}: {
  id: string;
  subject: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function remove() {
    if (
      !window.confirm(
        `Delete "${subject}"?\n\nThis removes the campaign and its send/open/click history for good. It does not affect any flyer it put on the website. This can't be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d?.error ?? "Delete failed.");
        setBusy(false);
        return;
      }
      router.push("/cocina/campaigns");
      router.refresh();
    } catch {
      setErr("Delete failed.");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        style={{
          background: "#fdecea",
          color: "#c0392b",
          border: "1px solid #f3c9c4",
          borderRadius: 8,
          padding: "9px 16px",
          fontSize: "0.9rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {busy ? "Deleting…" : "Delete campaign"}
      </button>
      {err ? <span style={{ color: "#c0392b" }}>{err}</span> : null}
    </div>
  );
}
