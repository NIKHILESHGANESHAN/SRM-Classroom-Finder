"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { glassSurfaceClasses } from "@/lib/glass";
import type { HelpChatWelcome } from "@/components/help/use-help-chat";
import { useHelpChat } from "@/components/help/use-help-chat";
import { EASE_OUT_EXPO, MOTION_STANDARD } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type HelpQuickPrompt = {
  label: string;
  question: string;
};

type HelpChatPanelProps = {
  variant: "page" | "floating";
  welcome: HelpChatWelcome;
  quickPrompts: readonly HelpQuickPrompt[];
  className?: string;
  autoFocusInput?: boolean;
  composerId?: string;
};

export function HelpChatPanel({
  variant,
  welcome,
  quickPrompts,
  className,
  autoFocusInput = false,
  composerId: composerIdProp,
}: HelpChatPanelProps) {
  const reduceMotion = useReducedMotion();
  const listId = useId();
  const generatedComposerId = useId();
  const composerId = composerIdProp ?? generatedComposerId;
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState("");

  const {
    messages,
    pending,
    error,
    sendMessage,
    startNewConversation,
    showQuickPrompts,
  } = useHelpChat({ welcome });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: "end",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, pending, reduceMotion]);

  useEffect(() => {
    if (autoFocusInput) {
      inputRef.current?.focus();
    }
  }, [autoFocusInput]);

  function submit(raw: string) {
    sendMessage(raw);
    setInput("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  const shellClass =
    variant === "page"
      ? "flex min-h-[min(70vh,36rem)] flex-col overflow-hidden rounded-surface border border-border bg-card shadow-token-sm"
      : "flex max-h-[min(600px,calc(100dvh-6rem-env(safe-area-inset-bottom)))] min-h-[min(500px,70dvh)] flex-col overflow-hidden rounded-surface border border-border bg-card shadow-token-lg";

  return (
    <div className={cn(shellClass, className)}>
      <div className="flex items-center justify-end gap-2 border-b border-border/70 px-3 py-2 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 shrink-0 gap-1.5 px-2 text-xs"
          onClick={startNewConversation}
          disabled={pending}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          New chat
        </Button>
      </div>

      <div
        id={listId}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
        {pending ? (
          <p className="text-sm text-muted-foreground" role="status">
            One moment…
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {showQuickPrompts ? (
        <div className="border-t border-border/70 px-3 py-3 sm:px-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Quick actions
          </p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                className="btn-press inline-flex min-h-11 items-center rounded-control border border-border bg-background px-3 text-left text-xs font-medium transition-standard hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => submit(prompt.question)}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form
        className={cn(
          glassSurfaceClasses({ variant: "clear" }),
          "flex items-end gap-2 border-t border-border/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4",
        )}
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <label htmlFor={composerId} className="sr-only">
          Ask ClassFinder Help
        </label>
        <Input
          ref={inputRef}
          id={composerId}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about ClassFinder…"
          className="min-h-11 flex-1 rounded-control border-border bg-background text-base"
          autoComplete="off"
          maxLength={500}
          disabled={pending}
        />
        <Button
          type="submit"
          className="btn-press min-h-11 min-w-11 shrink-0"
          disabled={pending || input.trim().length === 0}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>

      {variant === "floating" ? (
        <p className="border-t border-border/50 px-3 py-2 text-center text-[11px] text-muted-foreground sm:px-4">
          <Link href="/contact/chat" className="underline-offset-2 hover:underline">
            Open full-page Help
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function ChatMessageBubble({
  message,
}: {
  message: { role: "user" | "assistant"; text: string };
}) {
  const reduceMotion = useReducedMotion();
  const isUser = message.role === "user";

  return (
    <motion.div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_STANDARD, ease: EASE_OUT_EXPO }}
    >
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-wrap rounded-surface px-3 py-2.5 text-sm leading-relaxed sm:max-w-[80%]",
          isUser
            ? "bg-cf-accent text-primary-foreground"
            : "border border-border/70 bg-muted/40 text-foreground",
        )}
      >
        <span className="sr-only">{isUser ? "You: " : "Help: "}</span>
        {message.text}
      </div>
    </motion.div>
  );
}
