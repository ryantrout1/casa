"use client";

import { useState } from "react";
import { CHANNEL_LABEL, liveSurfaces, type ChannelId, type SurfaceFlags } from "@/lib/publish";

export type FiestaAdminRow = {
  id: string;
  image_url: string;
  caption: string | null;
  event_date: string | null;
  is_hero: boolean;
  in_grid: boolean;
  on_fiestas_page: boolean;
  is_evergreen: boolean;
};

const SURFACES: ChannelId[] = ["hero", "grid", "fiestas_page"];
const COL: Record<string, keyof FiestaAdminRow> = {
  hero: "is_hero",
  grid: "in_grid",
  fiestas_page: "on_fiestas_page",
};

function fmtDate(d: string | null, evergreen: boolean): string {
  if (evergreen) return "Evergreen";
  if (!d) return "No date";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FiestaManager({ fiestas }: { fiestas: FiestaAdminRow[] }) {
  const [rows, setRows] = useState<FiestaAdminRow[]>(fiestas);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  function flagsOf(r: FiestaAdminRow): SurfaceFlags {
    return { is_hero: r.is_hero, in_grid: r.in_grid, on_fiestas_page: r.on_fiestas_page };
  }

  async function toggle(row: FiestaAdminRow, surface: ChannelId) {
    const col = COL[surface];
    const next = !row[col];
    setErr("");
    setBusyId(row.id);
    const prev = rows;
    // Optimistic: flip the flag; turning a hero on demotes every other hero.
    setRows((rs) =>
      rs.map((r) => {
        if (r.id === row.id) return { ...r, [col]: next };
        if (surface === "hero" && next && r.is_hero) return { ...r, is_hero: false };
        return r;
      }),
    );
    try {
      const res = await fetch("/api/admin/fiestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id: row.id, surface, value: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d?.error ?? "Update failed.");
        setRows(prev);
      }
    } catch {
      setErr("Update failed.");
      setRows(prev);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: FiestaAdminRow) {
    if (
      !window.confirm("Delete this fiesta? It will disappear from every surface. This can't be undone.")
    ) {
      return;
    }
    setErr("");
    setBusyId(row.id);
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    try {
      const res = await fetch("/api/admin/fiestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: row.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d?.error ?? "Delete failed.");
        setRows(prev);
      }
    } catch {
      setErr("Delete failed.");
      setRows(prev);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1>Fiestas</h1>
      <p className="lede">
        Everything on the website right now. Toggle a surface to add or remove a flyer, or delete it
        outright — changes go live immediately.
      </p>

      {err ? (
        <div className="panel" style={{ color: "#c0392b", borderColor: "#f3c9c4" }}>
          {err}
        </div>
      ) : null}

      <div className="panel">
        {rows.length === 0 ? (
          <p className="muted">No fiestas yet. Publish one from Campaigns.</p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Flyer</th>
                <th>Date</th>
                <th>Live on</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const on = liveSurfaces(flagsOf(r));
                return (
                  <tr key={r.id} style={{ opacity: busyId === r.id ? 0.5 : 1 }}>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <img
                          src={r.image_url}
                          alt={r.caption ?? ""}
                          style={{
                            width: 44,
                            height: 44,
                            objectFit: "cover",
                            borderRadius: 6,
                            border: "1px solid #eee",
                            flexShrink: 0,
                          }}
                        />
                        <span>
                          {r.caption || <span className="muted">(no caption)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="muted">{fmtDate(r.event_date, r.is_evergreen)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {SURFACES.map((s) => {
                          const active = on.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => toggle(r, s)}
                              className={`pill${active ? " good" : ""}`}
                              style={{
                                cursor: "pointer",
                                border: active ? "none" : "1px dashed #cfd3da",
                                opacity: active ? 1 : 0.6,
                              }}
                              title={
                                active ? `Remove from ${CHANNEL_LABEL[s]}` : `Add to ${CHANNEL_LABEL[s]}`
                              }
                            >
                              {active ? "✓ " : ""}
                              {CHANNEL_LABEL[s]}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="pill"
                        disabled={busyId === r.id}
                        onClick={() => remove(r)}
                        style={{
                          cursor: "pointer",
                          border: "none",
                          background: "#fdecea",
                          color: "#c0392b",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
