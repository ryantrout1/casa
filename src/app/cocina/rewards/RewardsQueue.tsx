"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CARD_SIZE,
  rewardQueueLabel,
  daysWaiting,
  isAgedWaiting,
} from "@/lib/rewards";
import RedeemButton from "./RedeemButton";

export type Row = {
  id: string;
  type: string;
  earned_at: string;
  member_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  lifetime_visits: number;
  punch_progress: number;
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    timeZone: "America/Phoenix",
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function RewardsQueue({ rows }: { rows: Row[] }) {
  const [hideNeverVisited, setHideNeverVisited] = useState(false);

  const neverVisited = rows.filter((r) => r.lifetime_visits === 0).length;
  const shown = hideNeverVisited
    ? rows.filter((r) => r.lifetime_visits > 0)
    : rows;

  return (
    <>
      {neverVisited > 0 && (
        <label className="queue-filter">
          <input
            type="checkbox"
            checked={hideNeverVisited}
            onChange={(e) => setHideNeverVisited(e.target.checked)}
          />
          Hide never-visited signups ({neverVisited})
        </label>
      )}

      {shown.length === 0 ? (
        <p className="muted">
          Nothing to show with this filter — every waiting reward is for a member
          who hasn&apos;t visited yet. Uncheck the filter to see them.
        </p>
      ) : (
        <table className="t">
          <thead>
            <tr>
              <th>Member</th>
              <th>Reward</th>
              <th>Guest</th>
              <th>Waiting</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const days = daysWaiting(r.earned_at);
              const aged = isAgedWaiting(r.earned_at);
              return (
                <tr key={r.id}>
                  <td>
                    <Link href={`/cocina/members/${r.member_id}`}>
                      {r.name ?? r.email ?? r.phone ?? "(no name)"}
                    </Link>
                  </td>
                  <td><span className="pill good">{rewardQueueLabel(r.type)}</span></td>
                  <td>
                    {r.lifetime_visits === 0 ? (
                      <>
                        <span className="pill bad">New signup</span>
                        <div className="muted">never visited</div>
                      </>
                    ) : (
                      <>
                        {r.lifetime_visits} visit{r.lifetime_visits === 1 ? "" : "s"}
                        <div className="muted">punch {r.punch_progress}/{CARD_SIZE}</div>
                      </>
                    )}
                  </td>
                  <td>
                    <div>{fmtDate(r.earned_at)}</div>
                    <span className={aged ? "pill warn" : "muted"}>
                      {days}d waiting
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}><RedeemButton rewardId={r.id} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
