"use client";
import { useEffect, useRef, useState } from "react";
import {
  listCommissions,
  chatWithCommission,
  type Commission,
  type ChatTurn,
  type ChatResponse,
} from "@/lib/api";

const SUGGESTIONS = [
  "What are the most important developments in this graph?",
  "Which entities have the strongest connections?",
  "Summarize the latest brief in one sentence.",
  "What's missing — what would you ask the agent to research next?",
];

interface Message extends ChatTurn {
  id: string;
  context?: ChatResponse["context"];
  trace_id?: string | null;
  pending?: boolean;
  error?: string;
}

function mkId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listCommissions()
      .then((r) => {
        const active = r.commissions.filter((c) => c.status === "active");
        setCommissions(active);
        if (active.length > 0) setSelected(active[0].id);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [selected]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const selectedCommission = commissions.find((c) => c.id === selected) ?? null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !selected || sending) return;
    setSending(true);
    const userMsg: Message = { id: mkId(), role: "user", content: trimmed };
    const placeholder: Message = { id: mkId(), role: "assistant", content: "▶ thinking…", pending: true };
    const history: ChatTurn[] = messages
      .filter((m) => !m.pending && !m.error)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput("");
    try {
      const res = await chatWithCommission(selected, trimmed, history);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? { ...m, content: res.answer, pending: false, context: res.context, trace_id: res.trace_id }
            : m,
        ),
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? { ...m, content: "", pending: false, error: (e as Error).message }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      <aside className="col-span-3 border border-ink-light/10 bg-bg-dark-2/30 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-ink-light/10">
          <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
            ▶ COMMISSIONS
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {commissions.length === 0 ? (
            <div className="p-4 font-mono text-label-sm text-ink-light-muted">
              No active commissions. Create one on the dashboard first.
            </div>
          ) : (
            commissions.map((c) => {
              const active = c.id === selected;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-ink-light/10 transition-colors ${
                    active ? "bg-bg-dark-2 border-l-2 border-l-accent-lime" : "hover:bg-bg-dark-2/50 border-l-2 border-l-transparent"
                  }`}
                >
                  <div className={`font-mono text-label-sm truncate ${active ? "text-accent-lime" : "text-ink-light"}`}>
                    {c.query_text}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink-light-muted mt-1">
                    {c.entity_type} · {c.entity_id}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="col-span-9 border border-ink-light/10 bg-bg-dark-2/30 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-ink-light/10 flex items-center justify-between">
          <div>
            <div className="font-mono text-label-sm uppercase tracking-widest text-ink-light-muted">
              ▶ CHAT
            </div>
            <div className="font-display font-bold text-h3 text-ink-light truncate">
              {selectedCommission?.query_text ?? "select a commission →"}
            </div>
          </div>
          {selectedCommission && (
            <div className="font-mono text-label-sm text-ink-light-muted text-right hidden md:block">
              <div>
                model <span className="text-ink-light">qwen 2.5 7B</span>
              </div>
              <div>
                via <span className="text-ink-light">0G inference router</span>
              </div>
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && selectedCommission && (
            <div className="font-mono text-label-sm text-ink-light-muted">
              <p className="mb-3">
                Ask anything about <span className="text-ink-light">{selectedCommission.query_text}</span>. Answers
                are grounded in this commission&rsquo;s entities, edges, briefs, and uploads.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left border border-ink-light/10 px-3 py-2 hover:border-accent-lime/50 hover:text-accent-lime transition-colors"
                  >
                    ▸ {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <MessageRow key={m.id} message={m} />
          ))}
        </div>

        <div className="border-t border-ink-light/10 px-4 py-3">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={!selected || sending}
              placeholder={selected ? "Ask a question — Enter to send, Shift+Enter for newline" : "Pick a commission first"}
              className="flex-1 bg-bg-dark border border-ink-light/10 px-3 py-2 font-mono text-label-sm text-ink-light placeholder:text-ink-light-muted focus:border-accent-lime/50 focus:outline-none resize-none"
              rows={2}
            />
            <button
              onClick={() => send(input)}
              disabled={!selected || sending || !input.trim()}
              className="self-stretch px-4 bg-accent-lime text-bg-dark font-mono text-label-sm uppercase tracking-widest hover:bg-accent-lime-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? "…" : "SEND"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function MessageRow({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] border px-3 py-2 ${
          isUser
            ? "border-accent-lime/40 bg-accent-lime/5"
            : message.error
            ? "border-accent-orange/60 bg-accent-orange/10"
            : "border-ink-light/10 bg-bg-dark/60"
        }`}
      >
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-light-muted mb-1">
          {isUser ? "YOU" : message.error ? "ERROR" : message.pending ? "0G INFERENCE" : "ANSWER"}
        </div>
        <div className={`font-mono text-label text-ink-light whitespace-pre-wrap leading-relaxed ${message.pending ? "animate-pulse" : ""}`}>
          {message.error ? `▶ ${message.error}` : message.content}
        </div>
        {!isUser && !message.pending && !message.error && message.context && (
          <div className="mt-2 pt-2 border-t border-ink-light/10 font-mono text-[10px] uppercase tracking-widest text-ink-light-muted flex flex-wrap gap-3">
            <span>
              ctx: <span className="text-ink-light">{message.context.entities}E · {message.context.edges}rel · {message.context.briefs}br · {message.context.uploads}up</span>
            </span>
            {message.trace_id && (
              <span>
                trace <span className="text-ink-light">{message.trace_id.slice(0, 12)}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
