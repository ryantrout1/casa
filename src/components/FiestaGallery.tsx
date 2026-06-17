"use client";

import { useState, useEffect, useCallback } from "react";

export type FlyerItem = { img: string; alt: string; cap?: string };

export default function FiestaGallery({
  variant,
  items,
}: {
  variant: "gallery" | "wall";
  items: FlyerItem[];
}) {
  const [open, setOpen] = useState<FlyerItem | null>(null);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  function activate(f: FlyerItem) {
    return {
      role: "button" as const,
      tabIndex: 0,
      onClick: () => setOpen(f),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(f);
        }
      },
      "aria-label": `View flyer: ${f.cap || f.alt}`,
    };
  }

  return (
    <>
      {variant === "gallery" ? (
        <div className="gallery">
          {items.map((f) => (
            <div className="gcard flyer-zoom" key={f.img} {...activate(f)}>
              <img src={`/images/${f.img}.jpg`} alt={f.alt} />
            </div>
          ))}
        </div>
      ) : (
        <div className="fz-grid">
          {items.map((f) => (
            <div className="fzcard" key={f.img}>
              <div className="frame flyer-zoom" {...activate(f)}>
                <img src={`/images/${f.img}.jpg`} alt={f.alt} />
              </div>
              {f.cap ? <div className="cap">{f.cap}</div> : null}
            </div>
          ))}
        </div>
      )}

      {open ? (
        <div
          className="fl-overlay"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={open.cap || open.alt}
        >
          <button
            type="button"
            className="fl-close"
            onClick={close}
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={`/images/${open.img}.jpg`}
            alt={open.alt}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
