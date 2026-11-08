"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "When can I donate blood again?",
  "Which blood groups can I donate to?",
  "What should I eat before donating?",
  "আমার কাছাকাছি কোন রক্তের request আছে?",
];

export default function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    setError("");
    setInput("");
    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "The assistant could not answer right now.");
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="min-h-[320px] space-y-3 rounded-lg bg-white p-4 shadow">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Ask me about donating blood, your eligibility, or open requests. I can see your own donation data.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border px-3 py-1 text-xs text-brand-600 hover:bg-gray-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}

        {loading && <p className="text-sm text-gray-500">Thinking...</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Type your question..."
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <p className="text-xs text-gray-400">
        This assistant gives general information, not medical advice. In an emergency call 999.
      </p>
    </div>
  );
}