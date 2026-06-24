"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rewardLabel } from "@/lib/rewards";

type Reward = { id: string; type: string };

export default function Actions({
  memberId,
  earnedRewards,
}: {
  memberId: string;
  earnedRewards: Reward[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error ?? "Something went wrong.");
        return;
      }
      if (data.alreadyCheckedInToday) setMsg("Already checked in today.");
      else if (data.rewardEarned === "punch_dessert") setMsg("Visit added — free dessert earned!");
      else if (data.rewardEarned === "punch_entree") setMsg("Visit added — free entrée earned! Card reset.");
      else setMsg("Done.");
      router.refresh();
    } catch {
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="actions">
      <button disabled={busy} onClick={() => call({ action: "checkin", memberId })}>
        + Add today&apos;s visit
      </button>
      {earnedRewards.map((r) => (
        <button
          key={r.id}
          disabled={busy}
          onClick={() => call({ action: "redeem", rewardId: r.id })}
        >
          Mark “{rewardLabel(r.type)}” redeemed
        </button>
      ))}
      {msg ? <span className="msg">{msg}</span> : null}
    </div>
  );
}
