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
import {
  isDatabaseConnectivityError,
  LIVE_DATA_UNAVAILABLE_MESSAGE,
  sanitizeErrorForLog,
} from "@/lib/db-errors";
import { logger } from "@/lib/logger";
import { getClientIp, RATE_LIMITS, rateLimit } from "@/lib/rate-limit";

import type { HelpSessionContext } from "@/lib/help/session-context";

export type AskHelpResult = HelpReply & { live: boolean };

export async function askHelpAssistant(
  raw: string,
  context: HelpSessionContext = {},
): Promise<AskHelpResult> {
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

  const liveIntent = parseLiveHelpIntent(text, context);
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
        text: "Too many availability questions. Please wait a moment, or open ClassFinder.",
        entryId: null,
        live: true,
      };
    }
    try {
      const liveText = await answerLiveHelpIntent(liveIntent);
      return { kind: "answer", text: liveText, entryId: null, live: true };
    } catch (error) {
      logger.error("help.live_data_failed", {
        connectivity: isDatabaseConnectivityError(error),
        error: sanitizeErrorForLog(error),
      });
      const text = isDatabaseConnectivityError(error)
        ? `${LIVE_DATA_UNAVAILABLE_MESSAGE} Earlier messages in this chat may show older availability — they are not a fresh live check. You can also ask a how-to question.`
        : "I couldn't read live classroom data just now. Try ClassFinder, or ask a how-to question.";
      return {
        kind: "no_match",
        text,
        entryId: null,
        live: true,
      };
    }
  }

  const staticReply = answerHelpQuestion(text);
  return { ...staticReply, live: false };
}
