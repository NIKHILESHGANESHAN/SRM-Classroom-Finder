import {
  CHAT_PAGE_QUICK_PROMPTS,
  CHAT_QUICK_PROMPTS,
} from "@/lib/help/knowledge";

/** Shared welcome copy for the floating assistant. */
export const HELP_FLOATING_WELCOME = {
  lines: [
    "Hi — I'm ClassFinder Help.",
    "I can help you find rooms, understand reports, or explain how ClassFinder works.",
  ],
} as const;

/** Full-page /contact/chat welcome. */
export const HELP_PAGE_WELCOME = {
  lines: [
    "Hey! What are you looking for?",
    "I can help with finding rooms, reporting, confirmations, and how ClassFinder works.",
  ],
} as const;

export { CHAT_QUICK_PROMPTS, CHAT_PAGE_QUICK_PROMPTS };
