"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";

interface Msg {
  id: string;
  mine: boolean;
  text: string;
  createdAt: string;
}

// Chat between the requester and one donor of the same request.
export default function ChatPanel({
  requestId,
  peerId,
  peerName,
  canSend,
}: {
  requestId: string;
  peerId: string;
  peerName: string;
  canSend: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/requests/${requestId}/messages?with=${peerId}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not load messages");
      return;
    }
    setError("");
    setMessages((await res.json()).messages);
  }, [requestId, peerId]);

  // Load now, then check for new messages every 8 seconds
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/requests/${requestId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: peerId, text }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not send");
      return;
    }
    setText("");
    load();
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
          {peerName.charAt(0).toUpperCase()}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Chat with {peerName}</h2>
          <p className="text-xs text-slate-500">New messages appear automatically</p>
        </div>
      </div>

      <div className="h-72 space-y-2 overflow-y-auto bg-slate-50 p-4">
        {messages.length === 0 && (
          <p className="pt-24 text-center text-sm text-slate-400">No messages yet. Say hello.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                m.mine
                  ? "rounded-br-md bg-brand-600 text-white"
                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className={`mt-1 text-[10px] ${m.mine ? "text-brand-100" : "text-slate-400"}`}>
                {formatDateTime(m.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <div className="space-y-2 p-4">
        {canSend ? (
          <form onSubmit={send} className="flex gap-2">
            <input
              value={text}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button disabled={sending || !text.trim()} className="btn-primary disabled:opacity-50">
              Send
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">Your account is restricted, so you cannot send messages.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-slate-500">
          Never send money or share bank details. If a report is filed, an admin can read this chat.
        </p>
      </div>
    </section>
  );
}