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
    <section className="space-y-3 rounded-lg bg-white p-5 shadow">
      <h2 className="font-semibold">Chat with {peerName}</h2>

      <div className="h-64 space-y-2 overflow-y-auto rounded border bg-gray-50 p-3">
        {messages.length === 0 && <p className="text-center text-sm text-gray-400">No messages yet. Say hello.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.mine ? "bg-brand-600 text-white" : "bg-white shadow"}`}>
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className={`mt-1 text-[10px] ${m.mine ? "text-brand-100" : "text-gray-400"}`}>{formatDateTime(m.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {canSend ? (
        <form onSubmit={send} className="flex gap-2">
          <input
            value={text}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
          />
          <button disabled={sending || !text.trim()} className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
            Send
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500">Your account is restricted, so you cannot send messages.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">
        Never send money or share bank details. If a report is filed, an admin can read this chat.
      </p>
    </section>
  );
}