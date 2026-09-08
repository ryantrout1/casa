"use client";

import { Fragment, useState } from "react";
import { CHANNEL_LABEL, liveSurfaces, type ChannelId, type SurfaceFlags } from "@/lib/publish";
import { heroWhen, toPhoenixFields } from "@/lib/heroDates";
import { utcToPhoenixLocalInput } from "@/lib/schedule";
import type { HeroLang } from "@/lib/publish";
import { heroBlocks, otherLang } from "@/lib/heroAlt";
import {
  formatHexList,
  motifColumnsFrom,
  parseHexList,
} from "@/lib/heroForm";
import {
  ATTRACTION_ICONS,
  LOTERIA_CARDS,
  MAX_PALETTE,
  MIN_PALETTE,
  MOTIF_NAMES,
  NEON_ICONS,
  heroMotif,
} from "@/lib/heroMotif";

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
  hero_title_alt: string | null;
  hero_script_alt: string | null;
  hero_ribbon_alt: string | null;
  hero_sub_alt: string | null;
  hero_lang: HeroLang;
  hero_focus: number | null;
  hero_live_at: string | null;
  hero_bg: string | null;
  hero_accent: string | null;
  hero_ink: string | null;
  hero_motif: string | null;
  hero_palette: unknown;
  hero_title_colors: unknown;
  hero_tokens: unknown;
};

// The editable hero fields, as the form holds them.
type HeroDraft = {
  startDate: string;
  startTime: string;
  heroTitle: string;
  heroScript: string;
  heroRibbon: string;
  heroSub: string;
  heroTitleAlt: string;
  heroScriptAlt: string;
  heroRibbonAlt: string;
  heroSubAlt: string;
  heroLang: HeroLang;
  heroFocus: string;
  heroLiveLocal: string;
  heroBg: string;
  heroAccent: string;
  heroInk: string;
  motif: string;
  motifPalette: string;
  motifTitleColors: string;
  motifCards: string[];
  motifIcons: string[];
  motifBandTop: string;
  motifBandHeight: string;
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
    heroTitleAlt: r.hero_title_alt ?? "",
    heroScriptAlt: r.hero_script_alt ?? "",
    heroRibbonAlt: r.hero_ribbon_alt ?? "",
    heroSubAlt: r.hero_sub_alt ?? "",
    heroLang: r.hero_lang,
    heroFocus: r.hero_focus === null ? "" : String(r.hero_focus),
    heroLiveLocal: r.hero_live_at ? utcToPhoenixLocalInput(r.hero_live_at) : "",
    heroBg: r.hero_bg ?? "",
    heroAccent: r.hero_accent ?? "",
    heroInk: r.hero_ink ?? "",
    motif: r.hero_motif ?? "",
    motifPalette: formatHexList(r.hero_palette),
    motifTitleColors: formatHexList(r.hero_title_colors),
    motifCards: tokenList(r.hero_tokens, "cards"),
    motifIcons: tokenList(r.hero_tokens, "icons"),
    motifBandTop: tokenNum(r.hero_tokens, "bandTop"),
    motifBandHeight: tokenNum(r.hero_tokens, "bandHeight"),
  };
}

// hero_tokens is jsonb, so nothing about its shape is guaranteed on the way
// out of the database. Reading it defensively here is what stops a hand-edited
// row from throwing inside the editor.
function tokenRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function tokenList(v: unknown, key: string): string[] {
  const raw = tokenRecord(v)[key];
  return Array.isArray(raw) ? raw.filter((n): n is string => typeof n === "string") : [];
}

function tokenNum(v: unknown, key: string): string {
  const raw = tokenRecord(v)[key];
  return typeof raw === "number" && Number.isFinite(raw) ? String(raw) : "";
}

const LANG_NAME: Record<HeroLang, string> = { en: "English", es: "Spanish" };

// The admin's draft, in the shape heroAlt reasons about. Blank is absent —
// the same rule the hero itself applies, so the badge below cannot disagree
// with what the homepage will do.
function sourceOf(d: HeroDraft) {
  const v = (x: string) => (x.trim() === "" ? null : x.trim());
  return {
    heroLang: d.heroLang,
    heroTitle: v(d.heroTitle),
    heroScript: v(d.heroScript),
    heroRibbon: v(d.heroRibbon),
    heroSub: v(d.heroSub),
    heroTitleAlt: v(d.heroTitleAlt),
    heroScriptAlt: v(d.heroScriptAlt),
    heroRibbonAlt: v(d.heroRibbonAlt),
    heroSubAlt: v(d.heroSubAlt),
  };
}

// Whether this fiesta will actually rotate, named while the admin types.
// Without it the all-or-nothing rule is invisible: you fill in three of four
// lines, save, and the homepage silently does nothing.
function RotationStatus({ draft }: { draft: HeroDraft }) {
  const src = sourceOf(draft);
  const { primary, alt } = heroBlocks(src);
  const on = alt !== null;

  const missing = !on
    ? (["title", "script", "ribbon", "sub"] as const)
        .filter((k) => primary[k] !== null)
        .filter((k) => {
          const altKey = `hero${k[0].toUpperCase()}${k.slice(1)}Alt` as keyof typeof src;
          return src[altKey] === null;
        })
    : [];

  const LABEL: Record<string, string> = {
    title: "headline",
    script: "script line",
    ribbon: "ribbon",
    sub: "sub line",
  };

  return (
    <span
      style={{
        fontSize: 11,
        letterSpacing: ".04em",
        borderRadius: 999,
        padding: "2px 9px",
        background: on ? "#e6f7f4" : "#f1f3f7",
        color: on ? "#0d6b60" : "#5a6b82",
      }}
    >
      {on
        ? "Will rotate"
        : missing.length > 0
          ? `Not rotating — needs the ${missing.map((k) => LABEL[k]).join(", ")}`
          : "Not rotating"}
    </span>
  );
}

const MOTIF_LABEL: Record<string, string> = {
  "": "None — use the flyer takeover",
  loteria: "Lotería — cards",
  patrias: "Fiestas Patrias — fireworks & seal",
  cantina: "Cantina — string lights & neon",
  photo_band: "Photo band — crop from the flyer",
};

const CARD_LABEL: Record<string, string> = {
  el_sol: "El Sol",
  la_rosa: "La Rosa",
  la_luna: "La Luna",
  la_mano: "La Mano",
  el_corazon: "El Corazón",
  la_chalupa: "La Chalupa",
  la_sirena: "La Sirena",
  el_gallo: "El Gallo",
};

const ICON_LABEL: Record<string, string> = {
  music: "Live music",
  dancers: "Folklórico",
  chinelos: "Chinelos",
  crown: "Crowning",
  grito: "El Grito",
  vendors: "Vendors",
  food: "Food",
  mic: "Karaoke",
  drinks: "Drinks",
  star: "Good vibes",
};

// Whether this motif will actually draw, named while the admin picks. Same job
// as RotationStatus and for the same reason: heroMotif's all-or-nothing rule is
// invisible otherwise, so you choose a motif, mistype one hex, save, and the
// homepage silently keeps the old takeover with nothing to explain why.
//
// This calls the same resolver the homepage calls, through the same column
// builder the server writes with, so the badge cannot drift from the outcome.
function MotifStatus({ draft }: { draft: HeroDraft }) {
  const cols = motifColumnsFrom({
    motif: draft.motif,
    palette: draft.motifPalette,
    titleColors: draft.motifTitleColors,
    cards: draft.motifCards,
    icons: draft.motifIcons,
    bandTop: draft.motifBandTop,
    bandHeight: draft.motifBandHeight,
  });
  const plan = heroMotif({
    heroMotif: cols.motif,
    heroPalette: cols.palette,
    heroTitleColors: cols.titleColors,
    heroTokens: cols.tokens,
    heroTitle: draft.heroTitle.trim() || null,
  });
  const on = plan.motif !== "none";

  const why = (() => {
    if (on) return "";
    if (draft.motif === "") return "";
    const pal = parseHexList(draft.motifPalette);
    if (!pal) return " — needs 3–6 valid hex colours";
    if (pal.length < MIN_PALETTE || pal.length > MAX_PALETTE) {
      return ` — needs ${MIN_PALETTE}–${MAX_PALETTE} colours, has ${pal.length}`;
    }
    if (draft.motif === "photo_band") return " — needs a band top and height that fit in 0–100";
    if (draft.motif === "loteria") return " — pick 2–4 cards";
    return " — pick at least one icon";
  })();

  if (draft.motif === "") return null;

  return (
    <span
      style={{
        fontSize: 11,
        letterSpacing: ".04em",
        borderRadius: 999,
        padding: "2px 9px",
        background: on ? "#e6f7f4" : "#fdf0e6",
        color: on ? "#0d6b60" : "#8a4b18",
      }}
    >
      {on ? `Will draw the ${draft.motif} motif` : `Won't draw${why}`}
    </span>
  );
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
                hero_title_alt: draft.heroTitleAlt.trim() || null,
                hero_script_alt: draft.heroScriptAlt.trim() || null,
                hero_ribbon_alt: draft.heroRibbonAlt.trim() || null,
                hero_sub_alt: draft.heroSubAlt.trim() || null,
                hero_lang: draft.heroLang,
                // Mirror what the server stored, not what was typed — a bad
                // colour or crop is dropped server-side rather than rejected.
                hero_focus: d.heroFocus ?? null,
                hero_live_at: d.heroLiveAt ?? null,
                hero_bg: d.heroBg ?? null,
                hero_accent: d.heroAccent ?? null,
                hero_ink: d.heroInk ?? null,
                hero_motif: d.heroMotif ?? null,
                hero_palette: d.heroPalette ?? null,
                hero_title_colors: d.heroTitleColors ?? null,
                hero_tokens: d.heroTokens ?? null,
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
                          <p className="hint" style={{ margin: "2px 0 0" }}>
                            The hero shows the top of the flyer, so the headline, script line
                            and ribbon are already legible in the artwork and are not printed
                            again beside it. They are still used by the campaign email and the
                            fiestas grid. Put the details the crop cuts off — showtimes, all
                            ages — in the sub line below.
                          </p>
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            Sub line — what the flyer crop cuts off
                            <input
                              type="text"
                              placeholder="Cards 5 PM · First card 6 PM · All ages"
                              value={draft.heroSub}
                              onChange={(e) => setField("heroSub", e.target.value)}
                            />
                          </label>
                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                              padding: "10px 12px",
                              border: "1px solid #dfe5ee",
                              borderRadius: 8,
                              background: "#fff",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "baseline",
                                flexWrap: "wrap",
                              }}
                            >
                              <strong style={{ fontSize: 13 }}>
                                The same copy in {LANG_NAME[otherLang(draft.heroLang)]}
                              </strong>
                              <RotationStatus draft={draft} />
                            </div>
                            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                              The hero alternates between the two every few seconds. It only
                              rotates when every line above has a partner here — a half-filled
                              translation would make a line vanish and come back, so it is
                              ignored instead. Leave the event name in Spanish if that is what
                              the flyer says.
                            </p>
                            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                              Headline
                              <input
                                type="text"
                                placeholder="LOTERÍA"
                                value={draft.heroTitleAlt}
                                onChange={(e) => setField("heroTitleAlt", e.target.value)}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                              Script line
                              <input
                                type="text"
                                placeholder="¡Noche de!"
                                value={draft.heroScriptAlt}
                                onChange={(e) => setField("heroScriptAlt", e.target.value)}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                              Ribbon
                              <input
                                type="text"
                                placeholder="¡DIVERSIÓN! ★ ¡PREMIOS! ★ ¡COMUNIDAD!"
                                value={draft.heroRibbonAlt}
                                onChange={(e) => setField("heroRibbonAlt", e.target.value)}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                              Sub line
                              <input
                                type="text"
                                placeholder="Cartas a la venta desde las 5 PM"
                                value={draft.heroSubAlt}
                                onChange={(e) => setField("heroSubAlt", e.target.value)}
                              />
                            </label>
                          </div>
                          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                            Takeover goes live (Arizona) — blank means immediately
                            <input
                              type="datetime-local"
                              value={draft.heroLiveLocal}
                              onChange={(e) => setField("heroLiveLocal", e.target.value)}
                            />
                          </label>
                          <label
                            style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}
                          >
                            Flyer crop
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={draft.heroFocus === "" ? 50 : Number(draft.heroFocus)}
                              onChange={(e) => setField("heroFocus", e.target.value)}
                              style={{ flex: 1, maxWidth: 220 }}
                            />
                            <span style={{ minWidth: 40 }}>
                              {draft.heroFocus === "" ? "50" : draft.heroFocus}%
                            </span>
                            {draft.heroFocus !== "" ? (
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => setField("heroFocus", "")}
                              >
                                Reset
                              </button>
                            ) : null}
                          </label>
                          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13 }}>
                            {(
                              [
                                ["heroBg", "Background"],
                                ["heroAccent", "Accent"],
                                ["heroInk", "Text"],
                              ] as const
                            ).map(([key, label]) => (
                              <label key={key} style={{ display: "grid", gap: 3 }}>
                                {label}
                                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <input
                                    type="color"
                                    value={draft[key] || "#140c06"}
                                    onChange={(e) => setField(key, e.target.value)}
                                    style={{ width: 36, height: 28, padding: 0 }}
                                  />
                                  <input
                                    type="text"
                                    value={draft[key]}
                                    onChange={(e) => setField(key, e.target.value)}
                                    placeholder="#000000"
                                    style={{ width: 92 }}
                                  />
                                  {draft[key] ? (
                                    <button
                                      type="button"
                                      className="ghost"
                                      onClick={() => setField(key, "")}
                                    >
                                      Clear
                                    </button>
                                  ) : null}
                                </span>
                              </label>
                            ))}
                          </div>
                          <p className="hint" style={{ margin: 0 }}>
                            Leave the colours blank for the standard dark hero. Text colour is
                            derived from the background when blank, and always checked for
                            readability.
                          </p>

                          <div
                            style={{
                              borderTop: "1px solid #e6e8ee",
                              paddingTop: 14,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <strong style={{ fontSize: 13 }}>Motif</strong>
                              <MotifStatus draft={draft} />
                            </div>

                            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                              Composition
                              <select
                                value={draft.motif}
                                onChange={(e) => setField("motif", e.target.value)}
                              >
                                <option value="">{MOTIF_LABEL[""]}</option>
                                {MOTIF_NAMES.map((m) => (
                                  <option key={m} value={m}>
                                    {MOTIF_LABEL[m]}
                                  </option>
                                ))}
                              </select>
                            </label>

                            {draft.motif !== "" ? (
                              <>
                                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                                  Palette — {MIN_PALETTE}–{MAX_PALETTE} hex colours, most
                                  prominent first
                                  <input
                                    type="text"
                                    value={draft.motifPalette}
                                    onChange={(e) => setField("motifPalette", e.target.value)}
                                    placeholder="#f7ead0, #d42b2b, #2e7d4f, #6b3fa0"
                                  />
                                </label>
                                {parseHexList(draft.motifPalette) ? (
                                  <div style={{ display: "flex", gap: 5 }}>
                                    {parseHexList(draft.motifPalette)!.map((c, i) => (
                                      <span
                                        key={`${c}-${i}`}
                                        title={c}
                                        style={{
                                          width: 26,
                                          height: 20,
                                          borderRadius: 3,
                                          background: c,
                                          border: "1px solid #d7dae2",
                                        }}
                                      />
                                    ))}
                                  </div>
                                ) : null}

                                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                                  Headline colours — one per letter, or blank to cycle the
                                  palette
                                  {draft.heroTitle.trim() ? (
                                    <span className="hint" style={{ margin: 0 }}>
                                      &ldquo;{draft.heroTitle.trim()}&rdquo; needs{" "}
                                      {[...draft.heroTitle.normalize("NFC").trim()].length}{" "}
                                      colours
                                    </span>
                                  ) : null}
                                  <input
                                    type="text"
                                    value={draft.motifTitleColors}
                                    onChange={(e) =>
                                      setField("motifTitleColors", e.target.value)
                                    }
                                    placeholder="blank cycles the palette"
                                  />
                                </label>

                                {draft.motif === "loteria" ? (
                                  <fieldset
                                    style={{ border: 0, padding: 0, margin: 0, fontSize: 13 }}
                                  >
                                    <legend style={{ padding: 0 }}>Cards — pick 2 to 4</legend>
                                    <div
                                      style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
                                    >
                                      {LOTERIA_CARDS.map((c) => (
                                        <label
                                          key={c}
                                          style={{ display: "flex", gap: 5, alignItems: "center" }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={draft.motifCards.includes(c)}
                                            onChange={(e) =>
                                              setField(
                                                "motifCards",
                                                e.target.checked
                                                  ? [...draft.motifCards, c]
                                                  : draft.motifCards.filter((x) => x !== c),
                                              )
                                            }
                                          />
                                          {CARD_LABEL[c]}
                                        </label>
                                      ))}
                                    </div>
                                  </fieldset>
                                ) : null}

                                {draft.motif === "patrias" || draft.motif === "cantina" ? (
                                  <fieldset
                                    style={{ border: 0, padding: 0, margin: 0, fontSize: 13 }}
                                  >
                                    <legend style={{ padding: 0 }}>Icons — pick 1 to 6</legend>
                                    <div
                                      style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
                                    >
                                      {(draft.motif === "patrias"
                                        ? ATTRACTION_ICONS
                                        : NEON_ICONS
                                      ).map((ic) => (
                                        <label
                                          key={ic}
                                          style={{ display: "flex", gap: 5, alignItems: "center" }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={draft.motifIcons.includes(ic)}
                                            onChange={(e) =>
                                              setField(
                                                "motifIcons",
                                                e.target.checked
                                                  ? [...draft.motifIcons, ic]
                                                  : draft.motifIcons.filter((x) => x !== ic),
                                              )
                                            }
                                          />
                                          {ICON_LABEL[ic]}
                                        </label>
                                      ))}
                                    </div>
                                  </fieldset>
                                ) : null}

                                {draft.motif === "photo_band" ? (
                                  <div
                                    style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13 }}
                                  >
                                    <label style={{ display: "grid", gap: 3 }}>
                                      Band starts at %
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={draft.motifBandTop}
                                        onChange={(e) => setField("motifBandTop", e.target.value)}
                                        style={{ width: 90 }}
                                      />
                                    </label>
                                    <label style={{ display: "grid", gap: 3 }}>
                                      Band height %
                                      <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={draft.motifBandHeight}
                                        onChange={(e) =>
                                          setField("motifBandHeight", e.target.value)
                                        }
                                        style={{ width: 90 }}
                                      />
                                    </label>
                                  </div>
                                ) : null}

                                <p className="hint" style={{ margin: 0 }}>
                                  A motif is all-or-nothing. If the badge above says it
                                  won&rsquo;t draw, saving clears all four motif fields and the
                                  homepage keeps the flyer takeover.
                                </p>
                              </>
                            ) : null}
                          </div>
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
