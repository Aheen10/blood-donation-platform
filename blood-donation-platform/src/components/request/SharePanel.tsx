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

  const btn = "rounded border px-3 py-1.5 text-sm hover:bg-gray-50";

  return (
    <section className="space-y-3 rounded-lg bg-white p-5 shadow">
      <h2 className="font-semibold">Know someone who can help? Share this request</h2>

      <div className="flex flex-wrap gap-2">
        <a className={btn} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${enc(`${text} ${url}`)}`}>
          WhatsApp
        </a>
        <a className={btn} target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}>
          Facebook
        </a>
        <a className={btn} href={`sms:?body=${enc(`${text} ${url}`)}`}>
          SMS
        </a>
        <button type="button" className={btn} onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button type="button" className={btn} onClick={nativeShare}>
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
          className="min-w-0 flex-1 rounded border px-3 py-1.5 text-sm"
        />
        <button disabled={sending} className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
          Send
        </button>
      </form>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}
      <p className="text-xs text-gray-500">The shared link never shows the patient&apos;s name or phone number.</p>
    </section>
  );
}