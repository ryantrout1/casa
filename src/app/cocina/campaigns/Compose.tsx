"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Editor, { type EditorHandle } from "./Editor";
import {
  flyerMissingFromEmail,
  resultEntries,
  type ChannelId,
  type PublishResults,
} from "@/lib/publish";
import {
  phoenixLocalToUtcISO,
  utcToPhoenixLocalInput,
  type DraftFlyer,
} from "@/lib/schedule";
import { heroPayloadFrom, EMPTY_HERO_FORM, type HeroFormState } from "@/lib/heroForm";
import { heroWhen } from "@/lib/heroDates";
import { paletteFromFile } from "@/lib/paletteFromFile";
import { mergeSuggestions, type FlyerSuggestion } from "@/lib/flyerRead";
import type { Palette } from "@/lib/palette";
import HeroPanel from "./HeroPanel";
import { readiness, type ReadyState } from "@/lib/readiness";
import { buildAnnouncement, type EmailDraft } from "@/lib/emailTemplate";
import { rewardsLine } from "@/lib/rewardsLine";
import { imageIdOf } from "@/lib/platePrompt";
import { CHANNELS, channel } from "@/lib/channels";

const READY_CLS: Record<ReadyState, string> = {
  ready: "pill good",
  needs: "pill warn",
  off: "pill",
};
const READY_WORD: Record<ReadyState, string> = {
  ready: "Ready",
  needs: "Needs work",
  off: "Off",
};

type InitialDraft = {
  id: string;
  subject: string;
  body: string;
  channels: ChannelId[];
  flyer: DraftFlyer;
  status?: string;
  scheduledFor?: string | null;
};

// A stored UTC timestamp, shown as Arizona wall-clock time.
function fmtPhoenix(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Phoenix",
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function channelsRecord(list: ChannelId[] | undefined): Record<ChannelId, boolean> {
  // A new campaign defaults to the website surfaces only. Email is off because
  // it is the one destination that cannot be undone — the flyer can be edited
  // or pulled after publishing, but a send is a send. Opting in beats opting
  // out for that. A saved draft restores whatever it was saved with.
  if (!list) return { email: false, hero: true, grid: true, fiestas_page: true };
  return {
    email: list.includes("email"),
    hero: list.includes("hero"),
    grid: list.includes("grid"),
    fiestas_page: list.includes("fiestas_page"),
  };
}

export default function Compose({
  subscriberCount,
  defaultTestEmail,
  initialDraft,
}: {
  subscriberCount: number;
  defaultTestEmail: string;
  initialDraft?: InitialDraft;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [testEmail, setTestEmail] = useState(defaultTestEmail);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const editorRef = useRef<EditorHandle>(null);

  // Fiesta flyer (drives the website surfaces).
  const flyerFileRef = useRef<HTMLInputElement>(null);
  const [flyerUrl, setFlyerUrl] = useState(initialDraft?.flyer.imageUrl ?? "");
  const [flyerCaption, setFlyerCaption] = useState(initialDraft?.flyer.caption ?? "");
  const [flyerDate, setFlyerDate] = useState(initialDraft?.flyer.eventDate ?? "");
  const [flyerAlt, setFlyerAlt] = useState(initialDraft?.flyer.alt ?? "");
  const [flyerUploading, setFlyerUploading] = useState(false);

  // Takeover hero copy (optional). Start time uses the same Phoenix
  // datetime-local convention as the schedule field below, so the two date
  // controls in this form behave identically.
  const initialHero = initialDraft?.flyer.hero;
  const [hero, setHero] = useState<HeroFormState>({
    ...EMPTY_HERO_FORM,
    startLocal: initialHero?.startsAt ? utcToPhoenixLocalInput(initialHero.startsAt) : "",
    liveLocal: initialHero?.liveAt ? utcToPhoenixLocalInput(initialHero.liveAt) : "",
    title: initialHero?.title ?? "",
    script: initialHero?.script ?? "",
    ribbon: initialHero?.ribbon ?? "",
    sub: initialHero?.sub ?? "",
    titleAlt: initialHero?.titleAlt ?? "",
    scriptAlt: initialHero?.scriptAlt ?? "",
    ribbonAlt: initialHero?.ribbonAlt ?? "",
    subAlt: initialHero?.subAlt ?? "",
    lang: initialHero?.lang ?? "en",
    focus: initialHero?.focus === undefined ? "" : String(initialHero.focus),
    bg: initialHero?.bg ?? "",
    accent: initialHero?.accent ?? "",
    ink: initialHero?.ink ?? "",
    plateUrl: initialHero?.plateUrl ?? "",
    plateMobileUrl: initialHero?.plateMobileUrl ?? "",
    plateFocus: initialHero?.plateFocus === undefined ? "" : String(initialHero.plateFocus),
  });
  // Swatches sampled from the uploaded flyer. Null until a flyer is picked, or
  // when the browser could not decode it — either way the panel just hides the
  // strip and the admin can still type hex values.
  const [palette, setPalette] = useState<Palette | null>(null);
  // Fields filled by reading the flyer. Tracked so the panel can mark them as
  // suggestions and so editing one silently promotes it to the admin's own.
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState("");

  // The read finishes seconds after the upload begins, and the admin may well
  // have started typing in the meantime. Merging against the `hero` captured
  // when onPickFlyer ran would silently overwrite whatever they wrote, so the
  // read reads the live value instead.
  const heroRef = useRef(hero);
  heroRef.current = hero;

  const patchHero = (patch: Partial<HeroFormState>) => {
    setHero((h) => ({ ...h, ...patch }));
    // Anything the admin touches stops being a suggestion, so the "suggested"
    // tag never lingers on a value they wrote themselves.
    const keys = Object.keys(patch);
    setSuggested((prev) => {
      if (!keys.some((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      for (const k of keys) next.delete(k);
      return next;
    });
  };

  function clearSuggestions() {
    setHero((h) => {
      const next = { ...h };
      for (const k of suggested) {
        if (k === "lang") next.lang = "en";
        else next[k as "title"] = "";
      }
      return next;
    });
    setSuggested(new Set());
    setReadNote("");
  }

  // Ask the server to read the uploaded flyer and propose field values.
  // Everything about this is best-effort: it fills blanks only, it never
  // writes to the database, and any failure leaves the form untouched.
  async function readFlyer(imageUrl: string) {
    const imageId = imageUrl.split("/").pop() ?? "";
    if (!imageId) return;
    setReading(true);
    setReadNote("");
    try {
      const res = await fetch("/api/admin/read-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      const data = (await res.json()) as { ok?: boolean; suggestion?: FlyerSuggestion };
      if (!data?.ok || !data.suggestion) {
        setReadNote("Couldn't read the flyer — fill the fields in yourself.");
        return;
      }
      const s = data.suggestion;
      const { form: nextForm, suggested: filled } = mergeSuggestions(heroRef.current, s, Date.now());
      setHero(nextForm);
      setSuggested(new Set(filled));

      // Caption, alt, and the event date live outside the hero form. Same
      // rule: fill blanks only.
      if (s.caption) setFlyerCaption((c) => c || s.caption!);
      if (s.alt) {
        setFlyerAlt((a) => a || s.alt!);
        // The seeded body image went in before this read returned, so it has no
        // alt yet. Same fill-blanks-only rule as the field above.
        editorRef.current?.setImageAlt(imageUrl, s.alt);
      }
      if (nextForm.startLocal) setFlyerDate((d) => d || nextForm.startLocal.slice(0, 10));

      // Colours read off the design beat colours counted off the pixels: a
      // dark poster's background dominates by sheer area, which is why the
      // sampled strip comes back as five near-identical browns.
      if (s.bg && s.accent && s.ink) {
        setPalette({ swatches: [s.bg, s.accent, s.ink], bg: s.bg, accent: s.accent, ink: s.ink });
      }
      setReadNote(
        filled.size > 0
          ? "Read from your flyer — check each field before publishing."
          : "Read the flyer, but everything was already filled in.",
      );
    } catch {
      setReadNote("Couldn't read the flyer — fill the fields in yourself.");
    } finally {
      setReading(false);
    }
  }

  // Destinations. New campaigns default to the website surfaces; email is
  // opt-in because a send cannot be undone. Email also locks after it sends.
  const [channels, setChannels] = useState<Record<ChannelId, boolean>>(
    channelsRecord(initialDraft?.channels),
  );
  const [emailSent, setEmailSent] = useState(false);
  // Tracked for the checklist; the editor reports it on every change.
  const [emailEmpty, setEmailEmpty] = useState(!(initialDraft?.body ?? "").trim());
  // Wizard position. A saved draft opens on the review step, where the
  // checklist says what is left.
  const [step, setStep] = useState<number>(initialDraft ? 4 : 1);
  const [tab, setTab] = useState<"website" | "email">("website");
  // The day-of reminder, drafted alongside the announcement and sent as its
  // own scheduled campaign.
  const [reminderDraft, setReminderDraft] = useState<EmailDraft | null>(null);
  const [writing, setWriting] = useState(false);
  const [writeNote, setWriteNote] = useState("");
  // One personalized line above the sign-off. On by default; off for a send
  // that is not about coming in (an event somewhere else, say).
  const [includeRewards, setIncludeRewards] = useState(true);
  const [results, setResults] = useState<PublishResults | null>(null);
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);

  // Scheduling (Arizona wall-clock in the input; UTC on the wire).
  const isScheduled = initialDraft?.status === "scheduled";
  const [scheduleLocal, setScheduleLocal] = useState(
    initialDraft?.scheduledFor ? utcToPhoenixLocalInput(initialDraft.scheduledFor) : "",
  );

  function toggle(key: ChannelId) {
    setChannels((c) => ({ ...c, [key]: !c[key] }));
  }

  // Backstop for the case seeding cannot cover: the flyer is uploaded but the
  // message has no image, because it was deleted after seeding or the flyer
  // came from a draft saved before this behaviour existed.
  function confirmNoFlyer(): boolean {
    return window.confirm(
      "Your email message has no image, but a flyer is attached for the website. Send the email without the flyer?",
    );
  }

  function flyerPayload() {
    return {
      imageUrl: flyerUrl,
      caption: flyerCaption,
      alt: flyerAlt,
      eventDate: flyerDate || undefined,
      hero: heroPayloadFrom(hero),
    };
  }

  async function onPickFlyer(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErr(true);
      setMsg("The flyer must be an image.");
    } else if (f.size > 4_000_000) {
      setErr(true);
      setMsg("Flyer is over ~4MB — use a smaller/compressed version.");
    } else {
      setFlyerUploading(true);
      setMsg("");
      setErr(false);
      // Sample the palette from the File we already hold. Deliberately not
      // awaited before the upload and deliberately not allowed to fail it —
      // swatches are a convenience, publishing is not.
      void paletteFromFile(f).then(setPalette);
      try {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setErr(true);
          setMsg(data?.error ?? "Flyer upload failed.");
        } else {
          setFlyerUrl(data.url);
          // One upload, both destinations. The flyer field and the message
          // editor are separate inputs writing to separate columns, and an
          // admin who uploads once reasonably expects the flyer in the email
          // too — the August Loteria send went out with copy and no flyer for
          // exactly this reason. Seed it only into a body that has no image of
          // its own, so a deliberate choice of message art is never overwritten
          // and replacing the flyer never stacks a second copy.
          if (!editorRef.current?.hasImage()) {
            editorRef.current?.appendImage(data.url, flyerAlt);
          }
          void readFlyer(data.url);
        }
      } catch {
        setErr(true);
        setMsg("Flyer upload failed.");
      } finally {
        setFlyerUploading(false);
      }
    }
    if (flyerFileRef.current) flyerFileRef.current.value = "";
  }

  // Read the flyer and write both emails. The announcement lands in the
  // editor, where it is ordinary editable copy; the reminder is held for the
  // day-of send. Nothing is sent, and a failed read leaves the form alone.
  async function writeEmail() {
    const imageId = imageIdOf(flyerUrl);
    if (!imageId) {
      setErr(true);
      setMsg("Upload the flyer first, in step 1.");
      return;
    }
    if (
      !editorRef.current?.isEmpty() &&
      !window.confirm("Replace the message you have written with one read from the flyer?")
    ) {
      return;
    }
    setWriting(true);
    setWriteNote("");
    try {
      const res = await fetch("/api/admin/read-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, mode: "email" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!d?.ok || !d.drafts?.announcement) {
        setWriteNote("Couldn't read the flyer. Write the email yourself, or try again.");
        return;
      }
      const a = d.drafts.announcement as EmailDraft;
      setSubject(a.subject);
      editorRef.current?.setHTML(
        buildAnnouncement(a, { flyerUrl, flyerAlt, includeRewards }),
      );
      setReminderDraft((d.drafts.reminder as EmailDraft) ?? null);
      setWriteNote("Written from the flyer. Read it through and change anything you like.");
    } catch {
      setWriteNote("Couldn't read the flyer. Write the email yourself, or try again.");
    } finally {
      setWriting(false);
    }
  }

  async function saveDraft() {
    const html = editorRef.current?.getHTML() ?? "";
    const selected = (Object.keys(channels) as ChannelId[]).filter((k) => channels[k]);
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: draftId ? "update_draft" : "save_draft",
          id: draftId ?? undefined,
          subject,
          html,
          flyer: flyerPayload(),
          channels: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Couldn't save draft.");
        return;
      }
      setDraftId(data.id);
      setMsg("Draft saved.");
      router.refresh();
    } catch {
      setErr(true);
      setMsg("Couldn't save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft() {
    if (!draftId) return;
    if (!window.confirm("Delete this draft? This can't be undone.")) return;
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: draftId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(true);
        setMsg(d?.error ?? "Couldn't delete draft.");
        setBusy(false);
        return;
      }
      window.location.assign("/cocina/campaigns");
    } catch {
      setErr(true);
      setMsg("Couldn't delete draft.");
      setBusy(false);
    }
  }

  async function sendTest() {
    const html = editorRef.current?.getHTML() ?? "";
    if (!subject.trim() || editorRef.current?.isEmpty()) {
      setErr(true);
      setMsg("Add a subject and a message before sending a test.");
      return;
    }
    // A test send is an email send — it should show exactly what subscribers
    // would get, so it warns about a missing flyer just like publish does.
    if (flyerMissingFromEmail(html, flyerPayload(), ["email"]) && !confirmNoFlyer()) {
      return;
    }
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", subject, html, testEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Test failed.");
      } else {
        setMsg(`Test sent to ${testEmail}. Check your inbox.`);
      }
    } catch {
      setErr(true);
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    const html = editorRef.current?.getHTML() ?? "";
    const selected = (Object.keys(channels) as ChannelId[]).filter(
      (k) => channels[k] && !(k === "email" && emailSent),
    );
    if (selected.length === 0) {
      setErr(true);
      setMsg("Pick at least one destination.");
      return;
    }
    if (flyerMissingFromEmail(html, flyerPayload(), selected) && !confirmNoFlyer()) {
      return;
    }
    if (
      selected.includes("email") &&
      !window.confirm(`Email this to all ${subscriberCount} subscribers? This can't be undone.`)
    ) {
      return;
    }
    setBusy(true);
    setMsg("");
    setErr(false);
    setResults(null);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          subject,
          html,
          flyer: flyerPayload(),
          channels: selected,
          draftId: draftId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Publish failed.");
        return;
      }
      setResults(data.results as PublishResults);
      if (data.results?.email?.status === "ok") {
        setEmailSent(true);
        setChannels((c) => ({ ...c, email: false }));
      }
      // On a clean publish, land on a fresh campaigns page (the draft, if any, is
      // retired server-side). On any failure, keep the results panel up to read.
      if (data.ok) setTimeout(() => window.location.assign("/cocina/campaigns"), 4000);
    } catch {
      setErr(true);
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    const html = editorRef.current?.getHTML() ?? "";
    const selected = (Object.keys(channels) as ChannelId[]).filter((k) => channels[k]);
    const utc = phoenixLocalToUtcISO(scheduleLocal);
    if (!utc) {
      setErr(true);
      setMsg("Pick a valid Arizona date and time to schedule.");
      return;
    }
    // Same guards as Send now: scheduling an email IS a send — just deferred.
    if (flyerMissingFromEmail(html, flyerPayload(), selected) && !confirmNoFlyer()) {
      return;
    }
    if (
      selected.includes("email") &&
      !window.confirm(
        `Schedule this email to all ${subscriberCount} subscribers for ${fmtPhoenix(utc)} (Arizona time)? It will send automatically.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          id: draftId ?? undefined,
          subject,
          html,
          flyer: flyerPayload(),
          channels: selected,
          scheduledFor: utc,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(true);
        setMsg(data?.error ?? "Couldn't schedule.");
        setBusy(false);
        return;
      }
      window.location.assign("/cocina/campaigns");
    } catch {
      setErr(true);
      setMsg("Couldn't schedule.");
      setBusy(false);
    }
  }

  async function cancelSchedule() {
    if (!draftId) return;
    setBusy(true);
    setMsg("");
    setErr(false);
    try {
      const res = await fetch("/api/admin/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_schedule", id: draftId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(true);
        setMsg(d?.error ?? "Couldn't cancel the schedule.");
        setBusy(false);
        return;
      }
      window.location.assign("/cocina/campaigns");
    } catch {
      setErr(true);
      setMsg("Couldn't cancel the schedule.");
      setBusy(false);
    }
  }

  const anyWebsite = channels.hero || channels.grid || channels.fiestas_page;
  // The date line the live hero would render, so the preview shows the real
  // string rather than a placeholder.
  const previewHeroStart = hero.startLocal ? phoenixLocalToUtcISO(hero.startLocal) : null;
  const previewWhen = previewHeroStart
    ? heroWhen(previewHeroStart, flyerDate || null, hero.lang)
    : heroWhen(null, flyerDate || null, hero.lang);
  const previewDateLine = previewWhen
    ? [`${previewWhen.day} ${previewWhen.date}`, previewWhen.time].filter(Boolean).join(" · ")
    : "";

  const anyBusy = busy || uploading || flyerUploading;

  const check = readiness({
    selected: (Object.keys(channels) as ChannelId[]).filter((k) => channels[k]),
    subject,
    emailEmpty,
    emailSent,
    flyerUrl,
    caption: flyerCaption,
    eventDate: flyerDate,
    hero,
  });
  const websiteOn = anyWebsite;
  const emailOn = channels.email && !emailSent;
  const tabs: ("website" | "email")[] = [
    ...(websiteOn ? (["website"] as const) : []),
    ...(emailOn ? (["email"] as const) : []),
  ];
  const activeTab = tabs.includes(tab) ? tab : (tabs[0] ?? "website");

  function setWebsite(on: boolean) {
    setChannels((c) => ({ ...c, hero: on, grid: on, fiestas_page: on }));
  }

  const STEPS = [
    { n: 1, title: "The flyer", sub: "Name it and upload the flyer." },
    { n: 2, title: "Where it goes", sub: "Switch channels on." },
    { n: 3, title: "Make it fit", sub: "One tab per channel." },
    { n: 4, title: "Review & publish", sub: "Check, then send." },
  ] as const;

  return (
    <div className="wiz">
      <nav className="wiz-rail" aria-label="Campaign steps">
        {STEPS.map((st) => (
          <button
            key={st.n}
            type="button"
            className={step === st.n ? "wiz-step on" : "wiz-step"}
            aria-current={step === st.n ? "step" : undefined}
            onClick={() => setStep(st.n)}
          >
            <span className="wiz-dot">{st.n}</span>
            <span>
              <strong>{st.title}</strong>
              <span className="wiz-sub-label">{st.sub}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="panel compose wiz-main">
        {draftId ? (
          <div className="field-c" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="pill">{isScheduled ? "Scheduled" : "Draft"}</span>
            {isScheduled && initialDraft?.scheduledFor ? (
              <>
                <span>
                  Scheduled for <strong>{fmtPhoenix(initialDraft.scheduledFor)}</strong> (Arizona time)
                </span>
                <button className="ghost" disabled={anyBusy} onClick={cancelSchedule}>
                  Cancel schedule
                </button>
              </>
            ) : (
              <span className="muted">
                Editing a saved draft. <a href="/cocina/campaigns/new">Start a new campaign</a>
              </span>
            )}
          </div>
        ) : null}

        {/* Every step stays mounted and is only hidden, so nothing typed in
            one step is lost by visiting another. The email editor in
            particular keeps its content in the DOM. */}
        <section hidden={step !== 1} aria-label="The flyer">
          <h2 className="wiz-h">Start with the flyer</h2>
          <div className="field-c">
            <label htmlFor="cmp-subject">Campaign name (also the email subject)</label>
            <input
              id="cmp-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Del Rancho al Honky Tonk: Karaoke Night this Saturday!"
            />
          </div>
          <div className="field-c">
            <label>Flyer</label>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <button
                  type="button"
                  className="ghost"
                  disabled={flyerUploading}
                  onClick={() => flyerFileRef.current?.click()}
                >
                  {flyerUploading ? "Uploading…" : flyerUrl ? "Replace flyer" : "Upload flyer"}
                </button>
                <input ref={flyerFileRef} type="file" accept="image/*" hidden onChange={onPickFlyer} />
                <p className="hint">We read the name, date and colors from it for you.</p>
              </div>
              {flyerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flyerUrl}
                  alt="Flyer preview"
                  style={{ width: 120, height: "auto", borderRadius: 8, border: "1px solid #eee" }}
                />
              ) : null}
            </div>
          </div>
          <div className="field-c" style={{ display: "grid", gap: 8, maxWidth: 560 }}>
            <label htmlFor="cmp-caption">Caption (shown under the flyer on the website)</label>
            <input
              id="cmp-caption"
              type="text"
              value={flyerCaption}
              onChange={(e) => setFlyerCaption(e.target.value)}
              placeholder="e.g. Del Rancho al Honky Tonk Karaoke Night"
            />
            <label htmlFor="cmp-alt">Describe the flyer (for screen readers)</label>
            <input
              id="cmp-alt"
              type="text"
              value={flyerAlt}
              onChange={(e) => setFlyerAlt(e.target.value)}
              placeholder="e.g. Poster with a microphone, accordion and guitar"
            />
            <label htmlFor="cmp-date">Event date (leave blank for something ongoing)</label>
            <input id="cmp-date" type="date" value={flyerDate} onChange={(e) => setFlyerDate(e.target.value)} />
          </div>
        </section>

        <section hidden={step !== 2} aria-label="Where it goes">
          <h2 className="wiz-h">Where should it go?</h2>
          <div className="wiz-cards">
            <div className={websiteOn ? "wiz-card on" : "wiz-card"}>
              <label className="wiz-toggle">
                <input type="checkbox" checked={websiteOn} onChange={(e) => setWebsite(e.target.checked)} />
                <strong>{channel("website").label}</strong>
              </label>
              <p className="hint">{channel("website").description}</p>
              <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                {(["hero", "grid", "fiestas_page"] as const).map((k) => (
                  <label key={k} className="wiz-sub">
                    <input type="checkbox" checked={channels[k]} onChange={() => toggle(k)} />
                    {k === "hero"
                      ? "Homepage hero (takes over the top of the site)"
                      : k === "grid"
                        ? "Homepage upcoming fiestas grid"
                        : "Fiestas page"}
                  </label>
                ))}
              </div>
            </div>
            <div className={emailOn ? "wiz-card on" : "wiz-card"}>
              <label className="wiz-toggle" style={{ opacity: emailSent ? 0.55 : 1 }}>
                <input
                  type="checkbox"
                  checked={channels.email && !emailSent}
                  disabled={emailSent}
                  onChange={() => toggle("email")}
                />
                <strong>{channel("email").label}</strong>
                {emailSent ? <span className="hint" style={{ margin: 0 }}>(already sent)</span> : null}
              </label>
              <p className="hint">
                {channel("email").description} Goes to {subscriberCount}{" "}
                {subscriberCount === 1 ? "member" : "members"}.
              </p>
            </div>
            {CHANNELS.filter((c) => c.availability === "not_connected").map((c) => (
              <div key={c.key} className="wiz-card" style={{ opacity: 0.7 }}>
                <label className="wiz-toggle">
                  <input type="checkbox" disabled checked={false} readOnly />
                  <strong>{c.label}</strong>
                  <span className="pill warn">Not connected</span>
                </label>
                <p className="hint">
                  {c.description} <a href="/cocina/channels">See Channels</a>.
                </p>
              </div>
            ))}
          </div>
          <p className="hint">
            Coming later:{" "}
            {CHANNELS.filter((c) => c.availability === "coming_later")
              .map((c) => c.label)
              .join(", ")}
            .
          </p>
        </section>

        <section hidden={step !== 3} aria-label="Make it fit">
          <h2 className="wiz-h">Make it fit each channel</h2>
          {tabs.length === 0 ? (
            <p className="muted">Nothing is switched on yet. Pick channels in step 2.</p>
          ) : (
            <div role="tablist" aria-label="Channels" className="wiz-tabs">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t}
                  className={activeTab === t ? "wiz-tab on" : "wiz-tab"}
                  onClick={() => setTab(t)}
                >
                  {channel(t).label}
                </button>
              ))}
            </div>
          )}
          <div hidden={!(websiteOn && activeTab === "website")}>
            {channels.hero ? (
              <HeroPanel
                value={hero}
                onChange={patchHero}
                flyerUrl={flyerUrl}
                palette={palette}
                dateLine={previewDateLine}
                suggested={suggested}
                reading={reading}
                readNote={readNote}
                onClearSuggestions={clearSuggestions}
                onError={(m) => {
                  setErr(true);
                  setMsg(m);
                }}
              />
            ) : (
              <p className="muted">
                The homepage hero is off for this campaign, so the flyer from step 1 is all the
                website needs.
              </p>
            )}
          </div>
          {/* Always mounted: the editor holds the message in the DOM. */}
          <div hidden={!(emailOn && activeTab === "email")}>
            <div className="field-c" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="ghost" disabled={writing || anyBusy} onClick={writeEmail}>
                {writing ? "Reading the flyer…" : "Write the email from the flyer"}
              </button>
              <span className="hint" style={{ margin: 0 }}>
                {writeNote || "Fills the subject and the message in Casa's voice. You can edit every word."}
              </span>
            </div>
            <div className="field-c">
              <label>Email message</label>
              <Editor
                ref={editorRef}
                onUploadingChange={setUploading}
                initialHTML={initialDraft?.body}
                onEmptyChange={setEmailEmpty}
              />
              <p className="hint">Casa header, footer, and an unsubscribe link are added automatically.</p>
            </div>
            <label className="field-c" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={includeRewards}
                onChange={(e) => setIncludeRewards(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#a3175f" }}
              />
              <span style={{ fontWeight: 400, color: "#3a4150", fontSize: "0.92rem" }}>
                Add each member&rsquo;s rewards progress, just above the sign-off. Example:{" "}
                <em>{rewardsLine(4)}</em>
              </span>
            </label>

            <div className="field-c test-row">
              <label htmlFor="cmp-test">Send a test to</label>
              <input
                id="cmp-test"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <button className="ghost" disabled={anyBusy} onClick={sendTest}>
                Send test
              </button>
            </div>
          </div>
        </section>

        <section hidden={step !== 4} aria-label="Review and publish">
          <h2 className="wiz-h">Review and publish</h2>
          <div className="wiz-review">
            {check.channels.map((c) => (
              <div key={c.key} className="wiz-review-row">
                <strong>{c.label}</strong>
                <span>
                  <span className={READY_CLS[c.state]}>{READY_WORD[c.state]}</span>
                </span>
                <span className="muted" style={{ fontSize: "0.88rem" }}>
                  {c.missing.length > 0 ? `Needs ${c.missing.join(", ")}.` : null}
                  {c.notes.length > 0 ? ` ${c.notes.join(" ")}` : null}
                  {c.state === "ready" && c.key === "email"
                    ? `Goes to ${subscriberCount} members.`
                    : null}
                  {c.state === "ready" && c.key === "website"
                    ? [channels.hero && "homepage hero", channels.grid && "homepage grid", channels.fiestas_page && "Fiestas page"]
                        .filter(Boolean)
                        .join(", ")
                        .replace(/^./, (m) => m.toUpperCase()) + "."
                    : null}
                </span>
                <span>
                  {c.state !== "off" ? (
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setStep(c.key === "website" && c.missing.some((m) => m.includes("flyer")) ? 1 : 3);
                        if (c.key === "website" || c.key === "email") setTab(c.key);
                      }}
                    >
                      Edit
                    </button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>

          <div className="field-c test-row">
            <label htmlFor="cmp-when">Send later instead (Arizona time)</label>
            <input
              id="cmp-when"
              type="datetime-local"
              value={scheduleLocal}
              onChange={(e) => setScheduleLocal(e.target.value)}
            />
            <button
              className="ghost"
              disabled={anyBusy || !scheduleLocal || !check.canPublish}
              onClick={schedule}
            >
              {isScheduled ? "Reschedule" : "Schedule"}
            </button>
          </div>
          <p className="hint" style={{ marginTop: -8 }}>
            A scheduled campaign sends everything at that time. To show the hero at a different time
            than the email, set &ldquo;Takeover goes live&rdquo; in step 3.
          </p>
        </section>

        <div className="send-row" style={{ gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          {step > 1 ? (
            <button type="button" className="ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : null}
          {step < 4 ? (
            <button type="button" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button disabled={anyBusy || !check.canPublish} onClick={publish}>
              {busy ? "Working…" : draftId ? "Publish now" : "Publish campaign"}
            </button>
          )}
          {!isScheduled ? (
            <button className="ghost" disabled={anyBusy} onClick={saveDraft}>
              {draftId ? "Update draft" : "Save draft"}
            </button>
          ) : null}
          {draftId ? (
            <button className="ghost" disabled={anyBusy} onClick={deleteDraft} style={{ color: "#c0392b" }}>
              {isScheduled ? "Delete" : "Delete draft"}
            </button>
          ) : null}
          {msg ? <span className={err ? "send-msg err" : "send-msg ok"}>{msg}</span> : null}
        </div>

        {results ? (
          <div className="panel" style={{ marginTop: 16 }}>
            <strong>Publish results</strong>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
              {resultEntries(results).map((e) => (
                <li key={e.channel} style={{ padding: "3px 0" }}>
                  <span style={{ color: e.ok ? "#16a89e" : "#c0392b", fontWeight: 700 }}>
                    {e.ok ? "✓" : "✗"}
                  </span>{" "}
                  {e.label}
                  {e.detail ? <span className="muted"> ({e.detail})</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <aside className="panel wiz-side" aria-label="Checklist">
        <strong style={{ display: "block", marginBottom: 10 }}>Ready to publish?</strong>
        {check.general.length > 0 ? (
          <p className="hint" style={{ margin: "0 0 10px", color: "#b45309" }}>
            Still needs {check.general.join(" and ")}.
          </p>
        ) : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {check.channels.map((c) => (
            <li key={c.key} style={{ display: "grid", gap: 3 }}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{c.label}</span>
                <span className={READY_CLS[c.state]}>{READY_WORD[c.state]}</span>
              </span>
              {c.missing.length > 0 ? (
                <span className="hint" style={{ margin: 0 }}>Needs {c.missing.join(", ")}.</span>
              ) : null}
              {c.notes.length > 0 ? (
                <span className="hint" style={{ margin: 0 }}>{c.notes.join(" ")}</span>
              ) : null}
            </li>
          ))}
        </ul>
        {check.canPublish ? (
          <p className="hint" style={{ margin: "12px 0 0", color: "#1f7a44" }}>
            Everything that is switched on is ready.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
