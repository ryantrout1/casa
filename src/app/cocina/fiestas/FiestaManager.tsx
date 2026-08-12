"use client";

import { Fragment, useState } from "react";
import { CHANNEL_LABEL, liveSurfaces, type ChannelId, type SurfaceFlags } from "@/lib/publish";
import { heroWhen, toPhoenixFields } from "@/lib/heroDates";
import type { HeroLang } from "@/lib/publish";

export type FiestaAdminRow = {
  id: string;
  image_url: string;
  caption: string | null;
  event_date: string | null;
  starts_at: string | null;
  is_hero: boolean;
  in_grid: boolean;
  on_fiestas_page: boolean;
  is_evergreen: boolean;
  hero_title: string | null;
  hero_script: string | null;
  hero_ribbon: string | null;
  hero_sub: string | null;
  hero_lang: HeroLang;
};

// The editable hero fields, as the form holds them.
type HeroDraft = {
  startDate: string;
  startTime: string;
  heroTitle: string;
  heroScript: string;
  heroRibbon: string;
  heroSub: string;
  heroLang: HeroLang;
};

function draftOf(r: FiestaAdminRow): HeroDraft {
  const { date, time } = toPhoenixFields(r.starts_at);
  return {
    startDate: date,
    startTime: time,
    heroTitle: r.hero_title ?? "",
    heroScript: r.hero_script ?? "",
    heroRibbon: r.hero_ribbon ?? "",
    heroSub: r.hero_sub ?? "",
    heroLang: r.hero_lang,
  };
}

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

// Start time as the admin set it — Phoenix local, matching the form fields.
function fmtTime(startsAt: string): string {
  return heroWhen(startsAt, null, "en")?.time ?? "";
}

export default function FiestaManager({ fiestas }: { fiestas: FiestaAdminRow[] }) {
  const [rows, setRows] = useState<FiestaAdminRow[]>(fiestas);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HeroDraft | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function openEditor(row: FiestaAdminRow) {
    setErr("");
    setSaved(null);
    if (editId === row.id) {
      setEditId(null);
      setDraft(null);
      return;
    }
    setEditId(row.id);
    setDraft(draftOf(row));
  }

  function setField<K extends keyof HeroDraft>(key: K, value: HeroDraft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function saveHero(row: FiestaAdminRow) {
    if (!draft) return;
    setErr("");
    setSaved(null);
    setBusyId(row.id);
    try {
      const res = await fetch("/api/admin/fiestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sethero", id: row.id, ...draft }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d?.error ?? "Save failed.");
        return;
      }
      // Reflect what the server actually stored, not what was typed — the
      // date/time may have been rejected as malformed and stored as null.
      setRows((rs) =>
        rs.map((r) =>
          r.id === row.id
            ? {
                ...r,
                starts_at: d.startsAt ?? null,
                event_date: d.eventDate ?? r.event_date,
                hero_title: draft.heroTitle.trim() || null,
                hero_script: draft.heroScript.trim() || null,
                hero_ribbon: draft.heroRibbon.trim() || null,
                hero_sub: draft.heroSub.trim() || null,
                hero_lang: draft.heroLang,
              }
            : r,
        ),
      );
      setSaved(row.id);
      setEditId(null);
      setDraft(null);
    } catch {
      setErr("Save failed.");
    } finally {
      setBusyId(null);
    }
  }

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
                  <Fragment key={r.id}>
                  <tr style={{ opacity: busyId === r.id ? 0.5 : 1 }}>
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
                    <td className="muted">
                      {fmtDate(r.event_date, r.is_evergreen)}
                      {r.starts_at ? (
                        <>
                          <br />
                          <span style={{ fontSize: 12 }}>{fmtTime(r.starts_at)}</span>
                        </>
                      ) : null}
                      {saved === r.id ? (
                        <>
                          <br />
                          <span style={{ fontSize: 12, color: "#1d9e75" }}>Saved</span>
                        </>
                      ) : null}
                    </td>
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
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="pill"
                          disabled={busyId === r.id}
                          onClick={() => openEditor(r)}
                          style={{
                            cursor: "pointer",
                            border: "1px solid #cfd3da",
                            background: editId === r.id ? "#eef3fb" : "transparent",
                          }}
                          title="Edit the hero headline, ribbon and start time"
                        >
                          {editId === r.id ? "Close" : "Hero copy"}
                        </button>
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
                      </div>
                    </td>
                  </tr>
                  {editId === r.id && draft ? (
                    <tr key={`${r.id}-edit`}>
                      <td colSpan={4} style={{ background: "#f7f9fc" }}>
                        <div style={{ display: "grid", gap: 10, padding: "6px 2px 12px" }}>
                          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                            Fills the homepage hero when this fiesta is the hero. Leave the
                            headline blank to keep the standard ¡Bienvenidos! hero. Times are
                            Phoenix local.
                          </p>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                              Start date
                              <input
                                type="date"
                                value={draft.startDate}
                                onChange={(e) => setField("startDate", e.target.value)}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                              Start time
                              <input
                                type="time"
                                value={draft.startTime}
                                onChange={(e) => setField("startTime", e.target.value)}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                              Date line language
                              <select
                                value={draft.heroLang}
                                onChange={(e) => setField("heroLang", e.target.value as HeroLang)}
                              >
                                <option value="en">English</option>
                                <option value="es">Español</option>
                              </select>
                            </label>
                          </div>
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            Headline
                            <input
                              type="text"
                              placeholder="EL PALOMAZO"
                              value={draft.heroTitle}
                              onChange={(e) => setField("heroTitle", e.target.value)}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            Script line
                            <input
                              type="text"
                              placeholder="en Casa"
                              value={draft.heroScript}
                              onChange={(e) => setField("heroScript", e.target.value)}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            Ribbon
                            <input
                              type="text"
                              placeholder="UNA NOCHE DE KARAOKE MEXICANO"
                              value={draft.heroRibbon}
                              onChange={(e) => setField("heroRibbon", e.target.value)}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            Sub line
                            <input
                              type="text"
                              placeholder="Canta los éxitos de tus ídolos"
                              value={draft.heroSub}
                              onChange={(e) => setField("heroSub", e.target.value)}
                            />
                          </label>
                          <div>
                            <button
                              type="button"
                              className="pill good"
                              disabled={busyId === r.id}
                              onClick={() => saveHero(r)}
                              style={{ cursor: "pointer", border: "none" }}
                            >
                              {busyId === r.id ? "Saving…" : "Save hero copy"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
