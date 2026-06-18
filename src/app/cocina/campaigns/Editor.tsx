"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export type EditorHandle = { getHTML: () => string; isEmpty: () => boolean };

function preventDefault(e: React.MouseEvent) {
  e.preventDefault();
}

const Editor = forwardRef<EditorHandle, { onUploadingChange?: (b: boolean) => void }>(
  function Editor({ onUploadingChange }, ref) {
    const elRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
    const [uploading, setUploading] = useState(false);
    const [note, setNote] = useState("");

    useImperativeHandle(ref, () => ({
      getHTML: () => {
        // strip the selection outline class before exporting
        elRef.current?.querySelectorAll("img.img-sel").forEach((i) => i.classList.remove("img-sel"));
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
      elRef.current?.focus();
      const html = `<img src="${url}" alt="" style="width:100%;max-width:100%;height:auto;display:block;border-radius:8px;margin:10px 0;" /><p><br></p>`;
      document.execCommand("insertHTML", false, html);
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
      // Paste as plain text to keep the email HTML clean.
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    }

    function onClickEditor(e: React.MouseEvent) {
      const t = e.target as HTMLElement;
      if (selectedImg) selectedImg.classList.remove("img-sel");
      if (t.tagName === "IMG") {
        const img = t as HTMLImageElement;
        img.classList.add("img-sel");
        setSelectedImg(img);
      } else {
        setSelectedImg(null);
      }
    }

    function sizeImg(w: string) {
      if (!selectedImg) return;
      selectedImg.style.width = w;
      selectedImg.style.maxWidth = "100%";
      selectedImg.style.height = "auto";
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

        {selectedImg ? (
          <div className="rte-imgbar">
            <span>Selected image:</span>
            <button type="button" onMouseDown={preventDefault} onClick={() => sizeImg("25%")}>25%</button>
            <button type="button" onMouseDown={preventDefault} onClick={() => sizeImg("50%")}>50%</button>
            <button type="button" onMouseDown={preventDefault} onClick={() => sizeImg("75%")}>75%</button>
            <button type="button" onMouseDown={preventDefault} onClick={() => sizeImg("100%")}>Full</button>
          </div>
        ) : null}

        <div
          ref={elRef}
          className="rte-area"
          contentEditable
          suppressContentEditableWarning
          onPaste={onPaste}
          onClick={onClickEditor}
          data-placeholder="Write your message… format with the toolbar, add or paste an image anywhere, then click the image to resize it."
        />
        {note ? <p className="rte-note">{note}</p> : null}
      </div>
    );
  },
);

export default Editor;
