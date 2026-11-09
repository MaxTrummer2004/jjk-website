"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  deleteTrialRequestAction,
  markTrialDoneAction,
  reopenTrialAction,
  replyTrialAction,
  type TrialReplyState,
} from "./actions";

/**
 * Probetraining-Anfragen im Vorstandsbereich (09.11.2026).
 *
 * Offene oben, erledigte im aufklappbaren Archiv darunter. Erledigt heisst
 * nicht mehr geloescht: es steht dabei, wer es wann erledigt hat, und eine
 * kurze Notiz. Antworten per Mail gehen direkt von hier (nur wenn als Kontakt
 * eine E-Mail-Adresse angegeben ist); bei Telefonnummer oder Instagram-Namen
 * stehen stattdessen Knoepfe zum Anrufen, fuer WhatsApp oder Instagram.
 */

export interface TrialReply {
  body: string;
  sentBy: string;
  sentAt: string;
}

export interface TrialItem {
  id: number;
  name: string;
  contact: string;
  preferredDay: string | null;
  message: string | null;
  created: string;
  doneAt: string | null;
  doneBy: string | null;
  note: string | null;
  replies: TrialReply[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s/().-]{6,}$/;
const INSTA_RE = /^@?[A-Za-z0-9._]{2,30}$/;

type ContactKind =
  | { kind: "email"; email: string }
  | { kind: "phone"; tel: string; wa: string }
  | { kind: "instagram"; handle: string }
  | { kind: "other" };

function contactKind(raw: string): ContactKind {
  const c = raw.trim();
  if (EMAIL_RE.test(c)) return { kind: "email", email: c };
  if (PHONE_RE.test(c) && c.replace(/\D/g, "").length >= 6) {
    const digits = c.replace(/\D/g, "");
    // WhatsApp braucht die internationale Nummer ohne +: 0664… → 43664…
    const wa = c.startsWith("+") ? digits : digits.startsWith("00") ? digits.slice(2) : digits.startsWith("0") ? `43${digits.slice(1)}` : digits;
    return { kind: "phone", tel: c.replace(/[^\d+]/g, ""), wa };
  }
  const insta = c.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ?? (INSTA_RE.test(c) ? c.replace(/^@/, "") : null);
  if (insta) return { kind: "instagram", handle: insta };
  return { kind: "other" };
}

const btn =
  "inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-foreground hover:border-border-hot disabled:opacity-50";
const field =
  "w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground-dim/60 focus:border-accent/60 focus:outline-none";

function ContactLinks({ contact }: { contact: string }): ReactNode {
  const k = contactKind(contact);
  if (k.kind === "phone") {
    return (
      <span className="flex flex-wrap gap-2">
        <a href={`tel:${k.tel}`} className={btn}>
          Anrufen
        </a>
        <a href={`https://wa.me/${k.wa}`} target="_blank" rel="noopener noreferrer" className={btn}>
          WhatsApp
        </a>
      </span>
    );
  }
  if (k.kind === "instagram") {
    return (
      <a href={`https://instagram.com/${k.handle}`} target="_blank" rel="noopener noreferrer" className={btn}>
        Instagram öffnen
      </a>
    );
  }
  return null;
}

function ReplyForm({ item, meName }: { item: TrialItem; meName: string }): ReactNode {
  const [state, action, pending] = useActionState<TrialReplyState, FormData>(replyTrialAction, {});
  // Offen, solange seit dem Aufklappen nichts erfolgreich verschickt wurde:
  // `openedWith` merkt sich den Stand beim Aufklappen.
  const [openedWith, setOpenedWith] = useState<TrialReplyState | null>(null);
  const open = openedWith !== null && !(state.sent && state !== openedWith);
  const first = item.name.trim().split(/\s+/)[0] ?? "";
  const myFirst = meName.trim().split(/\s+/)[0] ?? meName;
  const draft = `Hallo ${first},\n\n\n\nLiebe Grüße\n${myFirst}\nJiu Jitsu Kaisen Akademie`;

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpenedWith(state)} className={btn}>
          {item.replies.length > 0 ? "Nochmal antworten" : "Per Mail antworten"}
        </button>
        {state.sent && !open ? <span className="text-sm text-foreground">Antwort verschickt.</span> : null}
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="request_id" value={item.id} />
      <p className="text-xs text-foreground-dim">
        Geht von info@jjk.academy an {item.contact}. Die Anfrage wird unten angehängt, Antworten
        kommen an info@jjk.academy.
      </p>
      <textarea name="body" defaultValue={draft} rows={8} maxLength={5000} required className={field} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Wird verschickt…" : "Abschicken"}
        </button>
        <button type="button" onClick={() => setOpenedWith(null)} className="text-sm text-foreground-dim hover:text-foreground">
          Abbrechen
        </button>
        {state.error ? (
          <span role="alert" className="text-sm text-accent-bright">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Replies({ replies }: { replies: TrialReply[] }): ReactNode {
  if (replies.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-col gap-2 border-l-2 border-accent/50 pl-3">
      {replies.map((r, i) => (
        <li key={i}>
          <p className="text-xs text-foreground-dim">
            Antwort von {r.sentBy}, {r.sentAt}
          </p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-foreground-dim">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}

function Card({ item, meName }: { item: TrialItem; meName: string }): ReactNode {
  const isEmail = contactKind(item.contact).kind === "email";
  return (
    <li className="rounded-xl border border-border bg-card-plate p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-foreground">{item.name}</p>
        <p className="text-xs text-foreground-dim">{item.created}</p>
      </div>
      <p className="mt-1 break-all text-sm text-foreground">{item.contact}</p>
      {item.preferredDay ? <p className="mt-1 text-sm text-foreground-dim">Wunschtag: {item.preferredDay}</p> : null}
      {item.message ? <p className="mt-2 whitespace-pre-line text-sm text-foreground-dim">{item.message}</p> : null}
      <Replies replies={item.replies} />

      {item.doneAt ? (
        <>
          <p className="mt-3 text-sm text-foreground">
            Erledigt von {item.doneBy ?? "?"}, {item.doneAt}
            {item.note ? <span className="text-foreground-dim"> · {item.note}</span> : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={reopenTrialAction}>
              <input type="hidden" name="request_id" value={item.id} />
              <button type="submit" className={btn}>
                Wieder öffnen
              </button>
            </form>
            <form
              action={deleteTrialRequestAction}
              onSubmit={(e) => {
                if (!window.confirm(`Anfrage von ${item.name} endgültig löschen?`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="request_id" value={item.id} />
              <button type="submit" className={`${btn} text-foreground-dim`}>
                Löschen
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {isEmail ? <ReplyForm item={item} meName={meName} /> : <ContactLinks contact={item.contact} />}
          <form action={markTrialDoneAction} className="flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="request_id" value={item.id} />
            <input
              name="note"
              maxLength={500}
              placeholder="Notiz, z. B. kommt Mittwoch 18:00"
              aria-label="Notiz"
              className={`${field} sm:flex-1`}
            />
            <button type="submit" className={`${btn} shrink-0 justify-center`}>
              Erledigt
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

export function TrialInbox({ items, meName }: { items: TrialItem[]; meName: string }): ReactNode {
  const open = items.filter((t) => !t.doneAt);
  const done = items.filter((t) => t.doneAt);
  return (
    <section className="mt-12">
      <h2 className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.24em] text-accent">
        Probetraining-Anfragen ({open.length})
      </h2>
      {open.length === 0 ? (
        <p className="mt-4 text-sm text-foreground-dim">Keine offenen Anfragen.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {open.map((t) => (
            <Card key={t.id} item={t} meName={meName} />
          ))}
        </ul>
      )}
      {done.length > 0 ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-foreground-dim hover:text-foreground">
            Erledigt ({done.length}) · bleiben 12 Monate gespeichert
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {done.map((t) => (
              <Card key={t.id} item={t} meName={meName} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
