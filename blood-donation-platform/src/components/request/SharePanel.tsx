"use client";

import { useState } from "react";

export default function SharePanel({
  requestId,
  shareCode,
  bloodGroup,
  hospitalName,
  city,
}: {
  requestId: string;
  shareCode: string;
  bloodGroup: string;
  hospitalName: string;
  city: string;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const url = typeof window !== "undefined" ? `${window.location.origin}/r/${shareCode}` : "";
  const text = `Urgent: ${bloodGroup} blood needed at ${hospitalName}, ${city}. Can you donate or share this?`;
  const enc = encodeURIComponent;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg(`Copy this link: ${url}`);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: "Blood request", text, url });
    } catch {
      /* user closed the share sheet */
    }
  }

  async function sendToFriend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg("");
    const res = await fetch(`/api/requests/${requestId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(data.error || "Could not share");
    else if (data.delivered) {
      setMsg("Sent. Your friend will see it in their notifications.");
      setEmail("");
    } else setMsg(data.message || "Not delivered. Send the link instead.");
  }

  const pill =
    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors";

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-slate-900">Know someone who can help?</h2>
        <p className="text-sm text-slate-500">Share this request so more donors see it.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          className={`${pill} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          target="_blank"
          rel="noreferrer"
          href={`https://wa.me/?text=${enc(`${text} ${url}`)}`}
        >
          WhatsApp
        </a>
        <a
          className={`${pill} border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100`}
          target="_blank"
          rel="noreferrer"
          href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}
        >
          Facebook
        </a>
        <a
          className={`${pill} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          href={`sms:?body=${enc(`${text} ${url}`)}`}
        >
          SMS
        </a>
        <button
          type="button"
          className={`${pill} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          onClick={copy}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            className={`${pill} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            onClick={nativeShare}
          >
            More...
          </button>
        )}
      </div>

      <form onSubmit={sendToFriend} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Friend's email (registered on this site)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button disabled={sending} className="btn-primary disabled:opacity-50">
          Send
        </button>
      </form>
      {msg && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{msg}</p>}
      <p className="text-xs text-slate-500">The shared link never shows the patient&apos;s name or phone number.</p>
    </section>
  );
}