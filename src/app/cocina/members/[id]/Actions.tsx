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
      let m = "Done.";
      if (data.alreadyCheckedInToday) m = "Already checked in today.";
      else if (data.rewardEarned === "punch_agua") m = "Visit added — free agua fresca earned!";
      else if (data.rewardEarned === "punch_dessert") m = "Visit added — free dessert earned!";
      else if (data.rewardEarned === "punch_appetizer") m = "Visit added — free appetizer earned! Card reset.";
      else if (data.birthdayGranted) m = "Birthday reward granted!";
      else if (data.alreadyGranted) m = "Birthday reward already given this year.";
      if (data.birthdayEarned) m += " 🎂 Birthday reward too!";
      setMsg(m);
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
      <button disabled={busy} onClick={() => call({ action: "grant_birthday", memberId })}>
        🎂 Grant birthday reward
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
