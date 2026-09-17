"use client";

import { useRef } from "react";

// "View Flyer" on the plate hero. The plate replaces the poster on screen, so
// this is the way back to Stephanie's artwork.
//
// A native <dialog> opened with showModal() does the accessibility work: it
// renders in the top layer (unaffected by the rotator's fade), traps focus,
// closes on Escape, and returns focus to this button on close. The only thing
// added here is closing on a backdrop click, which is a click whose target is
// the dialog itself rather than anything inside it.
//
// Nothing is decided here; the label and the image come from props.

export default function FlyerLightbox({
  src,
  alt,
  label,
  closeLabel,
}: {
  src: string;
  alt: string;
  label: string;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={ref}
        className="flyerbox"
        aria-label={alt || label}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" />
        <button
          type="button"
          className="flyerbox-x"
          aria-label={closeLabel}
          onClick={() => ref.current?.close()}
        >
          ×
        </button>
      </dialog>
    </>
  );
}
