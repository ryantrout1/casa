"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RedeemButton({ rewardId }: { rewardId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function redeem() {
    if (!window.confirm("Mark this reward redeemed? This removes it from the queue.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem", rewardId }),
      });
      if (res.ok) router.refresh();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button className="redeem-btn" onClick={redeem} disabled={busy}>
      {busy ? "…" : "Redeem"}
    </button>
  );
}
