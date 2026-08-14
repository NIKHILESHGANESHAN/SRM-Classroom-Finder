"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHAT_QUICK_PROMPTS } from "@/lib/help/knowledge";
import { askHelpAssistant } from "@/lib/actions/help";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

const WELCOME =
  "👋 Hi!\n\nI can help you with SRM KTR Classroom Finder.";

export function HelpChat() {
  const reduceMotion = useReducedMotion();
  const listId = useId();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: WELCOME },
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: "end",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, pending, reduceMotion]);

  function pushReply(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;

    const userId = `u-${Date.now()}`;
    setError(null);
    setPending(true);
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text: trimmed },
    ]);
    setInput("");

    const delay = reduceMotion ? 0 : 120;
    window.setTimeout(() => {
      void (async () => {
        try {
          const reply = await askHelpAssistant(trimmed);
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              text: reply.text,
            },
          ]);
        } catch {
          setError("Couldn't answer just now. Try again.");
        } finally {
          setPending(false);
          inputRef.current?.focus();
        }
      })();
    }, delay);
  }

  const showQuick = messages.length === 1 && !pending;

  return (
    <div className="flex min-h-[min(70vh,36rem)] flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div
        id={listId}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <p
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              <span className="sr-only">
                {message.role === "user" ? "You: " : "Assistant: "}
              </span>
              {message.text}
            </p>
          </div>
        ))}
        {pending ? (
          <p className="text-sm text-muted-foreground" role="status">
            Looking that up…
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {showQuick ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-3 py-3">
          {CHAT_QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-3 text-left text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => pushReply(prompt.question)}
            >
              {prompt.label}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          pushReply(input);
        }}
      >
        <label htmlFor="help-chat-input" className="sr-only">
          Ask about Classroom Finder
        </label>
        <Input
          ref={inputRef}
          id="help-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about Classroom Finder..."
          className="min-h-11 text-base"
          autoComplete="off"
          maxLength={500}
          disabled={pending}
        />
        <Button
          type="submit"
          className="min-h-11 min-w-11"
          disabled={pending || input.trim().length === 0}
          aria-label="Send"
        >
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
