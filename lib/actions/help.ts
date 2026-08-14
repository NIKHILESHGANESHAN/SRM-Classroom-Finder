"use server";

/**
 * Help assistant entry (V2.6): secrets → scope → live Finder → knowledge.
 * Live answers reuse the Finder data layer. No LLM.
 */

import { headers } from "next/headers";
import { answerLiveHelpIntent } from "@/lib/help/live-answer";
import { parseLiveHelpIntent } from "@/lib/help/live-intent";
import {
  MATCH_FALLBACK,
  SCOPE_REDIRECT,
  SECRET_REFUSAL,
  answerHelpQuestion,
  clampUserMessage,
  hasOutOfScopePattern,
  isSensitiveProbe,
  type HelpReply,
} from "@/lib/help/scope";
import { getClientIp, RATE_LIMITS, rateLimit } from "@/lib/rate-limit";

export type AskHelpResult = HelpReply & { live: boolean };

export async function askHelpAssistant(raw: string): Promise<AskHelpResult> {
  const text = clampUserMessage(raw);
  if (!text) {
    return { kind: "empty", text: MATCH_FALLBACK, entryId: null, live: false };
  }

  if (isSensitiveProbe(text)) {
    return {
      kind: "secret_refusal",
      text: SECRET_REFUSAL,
      entryId: null,
      live: false,
    };
  }

  if (hasOutOfScopePattern(text)) {
    return {
      kind: "out_of_scope",
      text: SCOPE_REDIRECT,
      entryId: null,
      live: false,
    };
  }

  const liveIntent = parseLiveHelpIntent(text);
  if (liveIntent) {
    const ip = getClientIp({ headers: headers() });
    const rl = rateLimit(
      `help-live:${ip}`,
      RATE_LIMITS.helpLive.limit,
      RATE_LIMITS.helpLive.windowMs,
    );
    if (!rl.success) {
      return {
        kind: "no_match",
        text: "Too many availability questions. Please wait a moment, or open Class Finder.",
        entryId: null,
        live: true,
      };
    }
    try {
      const liveText = await answerLiveHelpIntent(liveIntent);
      return { kind: "answer", text: liveText, entryId: null, live: true };
    } catch {
      return {
        kind: "no_match",
        text: "I couldn't read live classroom data just now. Try Class Finder, or ask a how-to question.",
        entryId: null,
        live: true,
      };
    }
  }

  const staticReply = answerHelpQuestion(text);
  return { ...staticReply, live: false };
}
