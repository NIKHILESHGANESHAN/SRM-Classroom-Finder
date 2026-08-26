"use client";

import { useCallback, useRef, useState } from "react";
import { askHelpAssistant } from "@/lib/actions/help";
import { parseLiveHelpIntent } from "@/lib/help/live-intent";
import {
  contextFromLiveIntent,
  EMPTY_HELP_CONTEXT,
  type HelpSessionContext,
} from "@/lib/help/session-context";

export type HelpChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type HelpChatWelcome = {
  lines: readonly string[];
};

type UseHelpChatArgs = {
  welcome: HelpChatWelcome;
};

type UseHelpChatResult = {
  messages: HelpChatMessage[];
  pending: boolean;
  error: string | null;
  sendMessage: (raw: string) => void;
  startNewConversation: () => void;
  showQuickPrompts: boolean;
};

function buildWelcomeMessages(welcome: HelpChatWelcome): HelpChatMessage[] {
  const text = welcome.lines.join("\n\n");
  return [{ id: "welcome", role: "assistant", text }];
}

export function useHelpChat({ welcome }: UseHelpChatArgs): UseHelpChatResult {
  const [messages, setMessages] = useState<HelpChatMessage[]>(() =>
    buildWelcomeMessages(welcome),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<HelpSessionContext>(EMPTY_HELP_CONTEXT);

  const sendMessage = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || pending) return;

      const userIntent = parseLiveHelpIntent(trimmed, contextRef.current);

      setError(null);
      setPending(true);
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", text: trimmed },
      ]);

      void (async () => {
        try {
          const reply = await askHelpAssistant(trimmed, contextRef.current);
          if (userIntent) {
            contextRef.current = contextFromLiveIntent(
              userIntent,
              contextRef.current,
            );
          }
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
        }
      })();
    },
    [pending],
  );

  const startNewConversation = useCallback(() => {
    contextRef.current = EMPTY_HELP_CONTEXT;
    setError(null);
    setPending(false);
    setMessages(buildWelcomeMessages(welcome));
  }, [welcome]);

  const showQuickPrompts = messages.length === 1 && !pending && !error;

  return {
    messages,
    pending,
    error,
    sendMessage,
    startNewConversation,
    showQuickPrompts,
  };
}
