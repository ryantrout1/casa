"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type EditorHandle = { getHTML: () => string; isEmpty: () => boolean };

function preventDefault(e: React.MouseEvent) {
  e.preventDefault();
}

const Editor = forwardRef<EditorHandle, { onUploadingChange?: (b: boolean) => void; initialHTML?: string }>(
  function Editor({ onUploadingChange, initialHTML }, ref) {
    const elRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [hasImage, setHasImage] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [note, setNote] = useState("");

    // Seed the (uncontrolled) editor with a draft's saved message, once.
    useEffect(() => {
      if (initialHTML && elRef.current && elRef.current.innerHTML.trim() === "") {
        elRef.current.innerHTML = initialHTML;
        if (initialHTML.includes("<img")) setHasImage(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      getHTML: () => {
        elRef.current
          ?.querySelectorAll("img.img-sel")
          .forEach((i) => i.classList.remove("img-sel"));
        return elRef.current?.innerHTML ?? "";
      },
      isEmpty: () => {
        const el = elRef.current;
        if (!el) return true;
        return (el.textContent ?? "").trim().length === 0 && !el.querySelector("img");
      },
    }));

    function exec(cmd: string, value?: string) {
      elRef.current?.focus();
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand(cmd, false, value);
    }

    function addLink() {
      const url = window.prompt("Link URL (https://…)");
      if (url) exec("createLink", url);
    }

    function selectImg(img: HTMLImageElement | null) {
      elRef.current
        ?.querySelectorAll("img.img-sel")
        .forEach((i) => i.classList.remove("img-sel"));
      if (img) img.classList.add("img-sel");
    }

    // The image the size controls act on: the one clicked (img-sel), else the last image.
    function currentImg(): HTMLImageElement | null {
      const el = elRef.current;
      if (!el) return null;
      const sel = el.querySelector("img.img-sel") as HTMLImageElement | null;
      if (sel) return sel;
      const imgs = el.querySelectorAll("img");
      return imgs.length ? (imgs[imgs.length - 1] as HTMLImageElement) : null;
    }

    async function uploadFile(file: File): Promise<string | null> {
      if (!file.type.startsWith("image/")) {
        setNote("That file isn't an image.");
        return null;
      }
      if (file.size > 4_000_000) {
        setNote("Image is over ~4MB — use a smaller/compressed version.");
        return null;
      }
      setUploading(true);
      onUploadingChange?.(true);
      setNote("Uploading…");
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setNote(data?.error ?? "Upload failed.");
          return null;
        }
        setNote("");
        return data.url as string;
      } catch {
        setNote("Upload failed.");
        return null;
      } finally {
        setUploading(false);
        onUploadingChange?.(false);
      }
    }

    function insertImage(url: string) {
      const el = elRef.current;
      if (!el) return;
      el.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${url}" alt="" style="width:100%;max-width:100%;height:auto;display:block;border-radius:8px;margin:10px 0;" /><p><br></p>`,
      );
      const imgs = el.querySelectorAll("img");
      const last = imgs.length ? (imgs[imgs.length - 1] as HTMLImageElement) : null;
      selectImg(last);
      setHasImage(true);
      setNote('Image added — use "Image size" below to shrink it.');
    }

    async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
      const f = e.target.files?.[0];
      if (f) {
        const url = await uploadFile(f);
        if (url) insertImage(url);
      }
      if (fileRef.current) fileRef.current.value = "";
    }

    async function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
      const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
      const imgItem = items.find((it) => it.type.startsWith("image/"));
      if (imgItem) {
        const file = imgItem.getAsFile();
        if (file) {
          e.preventDefault();
          const url = await uploadFile(file);
          if (url) insertImage(url);
          return;
        }
      }
      e.preventDefault();
      document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
    }

    function onClickEditor(e: React.MouseEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "IMG") {
        selectImg(t as HTMLImageElement);
        setHasImage(true);
      } else {
        selectImg(null);
      }
    }

    function sizeImg(w: string) {
      const img = currentImg();
      if (!img) {
        setNote("Add an image first, then set its size.");
        return;
      }
      img.style.width = w;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      selectImg(img);
    }

    return (
      <div className="rte">
        <div className="rte-toolbar">
          <button type="button" title="Bold" onMouseDown={preventDefault} onClick={() => exec("bold")}><b>B</b></button>
          <button type="button" title="Italic" onMouseDown={preventDefault} onClick={() => exec("italic")}><i>I</i></button>
          <button type="button" title="Underline" onMouseDown={preventDefault} onClick={() => exec("underline")}><u>U</u></button>
          <span className="sep" />
          <button type="button" title="Bulleted list" onMouseDown={preventDefault} onClick={() => exec("insertUnorderedList")}>• List</button>
          <button type="button" title="Numbered list" onMouseDown={preventDefault} onClick={() => exec("insertOrderedList")}>1. List</button>
          <button type="button" title="Add link" onMouseDown={preventDefault} onClick={addLink}>Link</button>
          <span className="sep" />
          <button type="button" title="Insert image" disabled={uploading} onMouseDown={preventDefault} onClick={() => fileRef.current?.click()}>
            + Image
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
        </div>

        <div className="rte-imgbar">
          <span>Image size:</span>
          <button type="button" onMouseDown={preventDefault} onClick={() => sizeImg("25%")}>25%</button>
          <button type="button" onMouseDown={preventDefault} onClick={() => sizeImg("40%")}>40%</button>
          <button type="button" onMouseDown={preventDefault} onClick={() => sizeImg("60%")}>60%</button>
          <button type="button" onMouseDown={preventDefault} onClick={() => sizeImg("80%")}>80%</button>
          <button type="button" onMouseDown={preventDefault} onClick={() => sizeImg("100%")}>Full</button>
          <span className="imgbar-hint">{hasImage ? "click an image to pick which one" : "add an image first"}</span>
        </div>

        <div
          ref={elRef}
          className="rte-area"
          contentEditable
          suppressContentEditableWarning
          onPaste={onPaste}
          onClick={onClickEditor}
          data-placeholder="Write your message… format with the toolbar, add or paste an image anywhere, then use Image size to shrink it."
        />
        {note ? <p className="rte-note">{note}</p> : null}
      </div>
    );
  },
);

export default Editor;
