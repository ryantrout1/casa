"use client";

import type { Palette } from "@/lib/palette";
import type { HeroFormState } from "@/lib/heroForm";
import type { HeroLang } from "@/lib/publish";
import HeroPreview from "./HeroPreview";

// The Hero destination panel. Everything it renders is controlled by the
// parent's HeroFormState, so the panel itself holds no state — which keeps the
// preview, the payload, and the form in lockstep by construction.

type Slot = "bg" | "accent" | "ink";
const SLOTS: { key: Slot; label: string; hint: string }[] = [
  { key: "bg", label: "Background", hint: "The section behind everything" },
  { key: "accent", label: "Accent", hint: "Eyebrow, script line, ribbon, button" },
  { key: "ink", label: "Text", hint: "Headline — leave blank to derive it" },
];

// A small marker on any field whose value came from reading the flyer rather
// than from the admin. It disappears the moment they edit that field, so the
// form never claims authorship of something they wrote.
function Tag() {
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: ".06em",
        background: "#eef2f7",
        color: "#4a6180",
        borderRadius: 999,
        padding: "2px 8px",
        marginLeft: 8,
        whiteSpace: "nowrap",
      }}
    >
      suggested
    </span>
  );
}

// An input plus its "suggested" marker, so every field reads the same way.
//
// Defined at module scope, NOT inside HeroPanel. A component declared inside a
// render body is a new type on every render, so React unmounts and remounts it
// — which would drop focus after every single keystroke.
function Row({
  k,
  placeholder,
  value,
  suggested,
  onChange,
}: {
  k: "title" | "script" | "ribbon" | "sub" | "titleAlt" | "scriptAlt" | "ribbonAlt" | "subAlt";
  placeholder: string;
  value: HeroFormState;
  suggested: Set<string>;
  onChange: (patch: Partial<HeroFormState>) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <input
        type="text"
        value={value[k]}
        onChange={(e) => onChange({ [k]: e.target.value })}
        placeholder={placeholder}
        style={{ flex: 1 }}
      />
      {suggested.has(k) ? <Tag /> : null}
    </div>
  );
}

export default function HeroPanel({
  value,
  onChange,
  flyerUrl,
  palette,
  dateLine,
  suggested,
  reading,
  readNote,
  onClearSuggestions,
}: {
  value: HeroFormState;
  onChange: (patch: Partial<HeroFormState>) => void;
  flyerUrl: string;
  palette: Palette | null;
  dateLine: string;
  suggested: Set<string>;
  reading: boolean;
  readNote: string;
  onClearSuggestions: () => void;
}) {
  const set = <K extends keyof HeroFormState>(k: K, v: HeroFormState[K]) => onChange({ [k]: v });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className="hint" style={{ margin: 0 }}>
        Fills the homepage hero takeover. Leave the headline blank to keep the standard
        ¡Bienvenidos! hero. You can edit all of this later in Fiestas.
      </p>

      {reading ? (
        <p className="hint" style={{ margin: 0 }}>Reading the flyer…</p>
      ) : readNote ? (
        <p
          className="hint"
          style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
        >
          <strong>{readNote}</strong>
          {suggested.size > 0 ? (
            <button type="button" className="ghost" onClick={onClearSuggestions}>
              Clear suggestions
            </button>
          ) : null}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label className="hint" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Event starts (Arizona)
          <input
            type="datetime-local"
            value={value.startLocal}
            onChange={(e) => set("startLocal", e.target.value)}
          />
          {suggested.has("startLocal") ? <Tag /> : null}
        </label>
        <label className="hint" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Takeover goes live (Arizona)
          <input
            type="datetime-local"
            value={value.liveLocal}
            onChange={(e) => set("liveLocal", e.target.value)}
          />
        </label>
        <label className="hint" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Language
          <select value={value.lang} onChange={(e) => set("lang", e.target.value as HeroLang)}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
      </div>
      <p className="hint" style={{ margin: "-4px 0 0" }}>
        Leave <strong>goes live</strong> blank to show the takeover as soon as you publish. The
        hero comes down on its own about six hours after the event starts.
      </p>

      <Row k="title" placeholder="Headline — e.g. EL PALOMAZO" value={value} suggested={suggested} onChange={onChange} />
      <Row k="script" placeholder="Script line — e.g. en Casa" value={value} suggested={suggested} onChange={onChange} />
      <Row k="ribbon" placeholder="Ribbon — e.g. UNA NOCHE DE KARAOKE MEXICANO" value={value} suggested={suggested} onChange={onChange} />
      <Row k="sub" placeholder="Sub-line — address, specials, anything the flyer doesn't already say" value={value} suggested={suggested} onChange={onChange} />

      <div
        style={{
          display: "grid",
          gap: 8,
          padding: "10px 12px",
          border: "1px solid #dfe5ee",
          borderRadius: 8,
        }}
      >
        <strong style={{ fontSize: 13 }}>
          The same copy in {value.lang === "es" ? "English" : "Spanish"}
        </strong>
        <p className="hint" style={{ margin: 0 }}>
          Optional. The hero alternates between the two every few seconds, and only when
          every line above has a partner here — a half-filled translation is ignored rather
          than shown, so a line never vanishes mid-rotation. You can also add this later in
          Fiestas.
        </p>
        <Row k="titleAlt" placeholder="Headline — e.g. LOTERÍA" value={value} suggested={suggested} onChange={onChange} />
        <Row k="scriptAlt" placeholder="Script line — e.g. ¡Noche de!" value={value} suggested={suggested} onChange={onChange} />
        <Row k="ribbonAlt" placeholder="Ribbon — e.g. ¡DIVERSIÓN! ★ ¡PREMIOS!" value={value} suggested={suggested} onChange={onChange} />
        <Row k="subAlt" placeholder="Sub-line in the other language" value={value} suggested={suggested} onChange={onChange} />
      </div>

      <div>
        <label className="hint" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          Flyer crop
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value.focus === "" ? 50 : Number(value.focus)}
            onChange={(e) => set("focus", e.target.value)}
            style={{ flex: 1, maxWidth: 260 }}
          />
          <span style={{ minWidth: 42 }}>{value.focus === "" ? "50" : value.focus}%</span>
          {value.focus !== "" ? (
            <button type="button" className="ghost" onClick={() => set("focus", "")}>
              Reset
            </button>
          ) : null}
        </label>
        <p className="hint" style={{ margin: "2px 0 0" }}>
          Lower shows more of the top of the flyer. Watch the preview — the aim is to keep faces
          out of the top edge.
        </p>
      </div>

      <div>
        <div className="hint" style={{ marginBottom: 6 }}>
          Colours from the flyer
          {suggested.has("bg") || suggested.has("accent") ? <Tag /> : null}
          {palette ? null : (
            <span> — upload a flyer to sample them, or type hex values below.</span>
          )}
        </div>
        {palette ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {palette.swatches.map((hex) => (
              <button
                key={hex}
                type="button"
                title={`${hex} — click to use as background, shift-click for accent`}
                onClick={(e) =>
                  e.shiftKey ? set("accent", hex) : set("bg", hex)
                }
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: hex,
                  border:
                    value.bg === hex || value.accent === hex
                      ? "3px solid #1f3a63"
                      : "1px solid #cfd3da",
                  cursor: "pointer",
                }}
              />
            ))}
            <button
              type="button"
              className="ghost"
              onClick={() =>
                onChange({ bg: palette.bg, accent: palette.accent, ink: "" })
              }
            >
              Use suggested
            </button>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {SLOTS.map(({ key, label, hint }) => (
            <label key={key} className="hint" style={{ display: "grid", gap: 3 }}>
              <span>
                {label} <span className="muted">— {hint}</span>
              </span>
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="color"
                  value={value[key] || "#140c06"}
                  onChange={(e) => set(key, e.target.value)}
                  style={{ width: 38, height: 30, padding: 0, border: "1px solid #cfd3da" }}
                />
                <input
                  type="text"
                  value={value[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder="#000000"
                  style={{ width: 96 }}
                />
                {value[key] ? (
                  <button type="button" className="ghost" onClick={() => set(key, "")}>
                    Clear
                  </button>
                ) : null}
              </span>
            </label>
          ))}
        </div>
        <p className="hint" style={{ margin: "6px 0 0" }}>
          Leave all three blank for the standard dark hero. Text colour is derived from the
          background when blank, and always checked for readability.
        </p>
      </div>

      <div>
        <div className="hint" style={{ marginBottom: 6 }}>Preview</div>
        <HeroPreview hero={value} flyerUrl={flyerUrl} dateLine={dateLine} />
      </div>
    </div>
  );
}
