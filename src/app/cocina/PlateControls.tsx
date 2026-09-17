"use client";

import { useRef, useState } from "react";
import { platePath, plateFocusCss, plateStatus, type PlateStatus } from "@/lib/heroPlate";
import { imageIdOf } from "@/lib/platePrompt";

// Whether the plate takeover will draw, named while the admin edits. Same job
// as RotationStatus and MotifStatus: the rules live in lib/heroPlate, and the
// badge asks that module rather than restating them.
const PLATE_STATUS_TEXT: Record<PlateStatus, string> = {
  none: "",
  on: "Will show the full-bleed plate",
  needs_desktop: "Won't show: add a desktop plate (the mobile one alone does nothing)",
  bad_url: "Can't use this image: re-upload it here (saving clears it)",
  needs_copy: "Won't show yet: needs a headline and a start date",
};

export function PlateStatusBadge({
  plateUrl,
  plateMobileUrl,
  hasTitle,
  hasDate,
}: {
  plateUrl: string;
  plateMobileUrl: string;
  hasTitle: boolean;
  hasDate: boolean;
}) {
  const status = plateStatus({ plateUrl, plateMobileUrl, hasTitle, hasDate });
  if (status === "none") return null;
  const on = status === "on";
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
      {PLATE_STATUS_TEXT[status]}
    </span>
  );
}

// One plate slot: a preview framed the way the homepage frames it, and
// upload / replace / remove. The preview box has the live hero's shape
// (wide band on desktop, square on a phone) so the crop slider means the same
// thing here as on the site.
export function PlateSlot({
  label,
  hint,
  value,
  focus,
  aspect,
  disabled,
  onChange,
  onError,
}: {
  label: string;
  hint: string;
  value: string;
  focus: string;
  aspect: string;
  disabled: boolean;
  onChange: (path: string) => void;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const path = platePath(value);
  const pos = plateFocusCss(focus.trim() === "" ? null : Number(focus));

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      onError("The plate must be an image.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(d?.error ?? "Plate upload failed.");
        return;
      }
      // Stored as a path, never a host. The server enforces this too; doing
      // it here keeps the preview and the badge honest before saving.
      const p = platePath(d?.url);
      if (!p) {
        onError("Upload returned an address that can't be used for a plate.");
        return;
      }
      onChange(p);
    } catch {
      onError("Plate upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, fontSize: 13, width: 240 }}>
      <strong style={{ fontSize: 12 }}>{label}</strong>
      <div
        style={{
          width: "100%",
          aspectRatio: aspect,
          borderRadius: 8,
          border: "1px solid #dfe5ee",
          background: "#140c06",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={path}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos }}
          />
        ) : (
          <span style={{ color: "#8a8f99", fontSize: 12 }}>
            {value.trim() ? "Unusable image" : "No plate"}
          </span>
        )}
      </div>
      <span className="muted" style={{ fontSize: 12 }}>
        {hint}
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <button
          type="button"
          className="ghost"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : value.trim() ? "Replace" : "Upload"}
        </button>
        {value.trim() ? (
          <button
            type="button"
            className="ghost"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Writes the image-model prompts for this flyer's plates. The admin pastes each
// into Google AI Studio (set the aspect ratio there too), downloads the result,
// and uploads it in the slot above. Nothing is generated or stored here.
function PromptHelper({ flyerUrl }: { flyerUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [prompts, setPrompts] = useState<{ desktop: string; mobile: string } | null>(null);
  const [copied, setCopied] = useState<"" | "desktop" | "mobile">("");
  const imageId = imageIdOf(flyerUrl);

  async function write() {
    if (!imageId) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/read-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, mode: "scene" }),
      });
      const d = await res.json().catch(() => ({}));
      if (d?.ok && d.prompts?.desktop && d.prompts?.mobile) {
        setPrompts({ desktop: d.prompts.desktop, mobile: d.prompts.mobile });
      } else {
        setNote("Couldn't read the flyer. Try again, or write the prompt by hand.");
      }
    } catch {
      setNote("Couldn't read the flyer. Try again, or write the prompt by hand.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(which: "desktop" | "mobile") {
    if (!prompts) return;
    try {
      await navigator.clipboard.writeText(prompts[which]);
      setCopied(which);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setNote("Copy failed. Select the text and copy it yourself.");
    }
  }

  if (!imageId) {
    return (
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        Upload the flyer first to get a plate prompt.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="ghost" disabled={busy} onClick={write}>
          {busy ? "Reading the flyer…" : prompts ? "Rewrite plate prompts" : "Write plate prompts"}
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          Paste each into Google AI Studio with the matching aspect ratio set, then upload the
          image above. Check the result for stray lettering before saving.
        </span>
      </div>
      {note ? <span style={{ color: "#b42318", fontSize: 12 }}>{note}</span> : null}
      {prompts
        ? (
            [
              ["desktop", "Desktop plate (set 16:9)"],
              ["mobile", "Phone plate (set 4:5)"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <strong style={{ fontSize: 12 }}>{label}</strong>
                <button type="button" className="ghost" onClick={() => copy(k)}>
                  {copied === k ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                readOnly
                value={prompts[k]}
                rows={8}
                style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          ))
        : null}
    </div>
  );
}

export type PlatePatch = { plateUrl?: string; plateMobileUrl?: string; plateFocus?: string };

/**
 * The whole Background plate section, shared by /cocina/fiestas and the
 * campaign composer so the two cannot drift. Holds no plate state of its own;
 * the parent owns the three strings.
 */
export default function PlateControls({
  flyerUrl,
  plateUrl,
  plateMobileUrl,
  plateFocus,
  hasTitle,
  hasDate,
  disabled,
  onChange,
  onError,
}: {
  /** The fiesta's flyer, read to write the plate prompts. */
  flyerUrl: string;
  plateUrl: string;
  plateMobileUrl: string;
  plateFocus: string;
  hasTitle: boolean;
  hasDate: boolean;
  disabled: boolean;
  onChange: (patch: PlatePatch) => void;
  onError: (msg: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>Background plate</strong>
        <PlateStatusBadge
          plateUrl={plateUrl}
          plateMobileUrl={plateMobileUrl}
          hasTitle={hasTitle}
          hasDate={hasDate}
        />
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        A text-free image made from the flyer. When set, it fills the whole hero with the
        headline and buttons over it, and a View Flyer button opens the poster. It takes
        priority over the motif and the flyer crop. Remove both plates to go back.
      </p>
      <PromptHelper flyerUrl={flyerUrl} />
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <PlateSlot
          label="Desktop"
          hint="Wide (16:9). Required."
          value={plateUrl}
          focus={plateFocus}
          aspect="16 / 7"
          disabled={disabled}
          onChange={(v) => onChange({ plateUrl: v })}
          onError={onError}
        />
        <PlateSlot
          label="Phone"
          hint="Portrait (4:5). Optional: phones use the desktop plate without it."
          value={plateMobileUrl}
          focus={plateFocus}
          aspect="1 / 1"
          disabled={disabled}
          onChange={(v) => onChange({ plateMobileUrl: v })}
          onError={onError}
        />
      </div>
      {plateUrl || plateMobileUrl ? (
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
          Plate crop
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={plateFocus === "" ? 50 : Number(plateFocus)}
            onChange={(e) => onChange({ plateFocus: e.target.value })}
            style={{ flex: 1, maxWidth: 220 }}
          />
          <span style={{ minWidth: 40 }}>{plateFocus === "" ? "50" : plateFocus}%</span>
          {plateFocus !== "" ? (
            <button type="button" className="ghost" onClick={() => onChange({ plateFocus: "" })}>
              Reset
            </button>
          ) : null}
        </label>
      ) : null}
    </div>
  );
}
