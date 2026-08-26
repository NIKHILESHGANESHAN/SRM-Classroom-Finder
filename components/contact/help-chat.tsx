"use client";

import { HelpChatPanel } from "@/components/help/help-chat-panel";
import {
  CHAT_PAGE_QUICK_PROMPTS,
  HELP_PAGE_WELCOME,
} from "@/lib/help/help-ui";

/** Full-page ClassFinder Help — `/contact/chat`. */
export function HelpChat() {
  return (
    <HelpChatPanel
      variant="page"
      welcome={HELP_PAGE_WELCOME}
      quickPrompts={CHAT_PAGE_QUICK_PROMPTS}
    />
  );
}
