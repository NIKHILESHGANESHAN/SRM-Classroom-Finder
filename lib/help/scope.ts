/**
 * Deterministic help-chat scope, matching, and replies (V2.5).
 * No LLM. No network. User text is untrusted input only.
 */

import { KNOWLEDGE, type KnowledgeEntry } from "@/lib/help/knowledge";

export const SCOPE_REDIRECT =
  "I'm here to help with SRM KTR Classroom Finder. Please ask something related to using the website, finding classrooms, reporting rooms, or understanding how Classroom Finder works.";

export const MATCH_FALLBACK =
  "I'm here to help with SRM KTR Classroom Finder. Please ask me about finding classrooms, reporting rooms, confirmations, availability, privacy, or using the website.";

export const UNKNOWN_FEATURE =
  "That feature is not currently available in SRM KTR Classroom Finder.";

export const SECRET_REFUSAL =
  "I can't share server secrets, environment variables, or internal credentials. Ask about using Classroom Finder, reporting rooms, privacy, or how the public features work.";

export type HelpReplyKind =
  | "answer"
  | "out_of_scope"
  | "unknown_feature"
  | "no_match"
  | "secret_refusal"
  | "empty";

export type HelpReply = {
  kind: HelpReplyKind;
  text: string;
  entryId: string | null;
};

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "do",
  "does",
  "did",
  "how",
  "what",
  "why",
  "when",
  "where",
  "who",
  "can",
  "i",
  "me",
  "my",
  "we",
  "you",
  "your",
  "it",
  "to",
  "of",
  "in",
  "on",
  "for",
  "and",
  "or",
  "with",
  "this",
  "that",
  "please",
  "tell",
]);

const IN_SCOPE_TERMS = [
  "classroom",
  "finder",
  "room",
  "rooms",
  "ub",
  "tp1",
  "tp2",
  "building",
  "floor",
  "report",
  "contributor",
  "occupied",
  "still free",
  "confirm",
  "confirmation",
  "confidence",
  "confirmed",
  "unverified",
  "freshness",
  "fresh",
  "expiry",
  "expire",
  "countdown",
  "token",
  "anonymous",
  "privacy",
  "share",
  "favorite",
  "recent",
  "stats",
  "pwa",
  "install",
  "slot",
  "hidden",
  "strike",
  "inventory",
  "contact",
  "community",
  "faq",
  "feedback",
  "chat",
  "how it works",
  "dbms",
  "postgres",
  "prisma",
  "sql",
  "polling",
  "ending soon",
  "recently reported",
  "srm",
  "ktr",
  "otp",
  "account",
  "login",
] as const;

const OUT_OF_SCOPE_PATTERNS: readonly RegExp[] = [
  /\bweather\b/,
  /\bforecast\b/,
  /\bwrite me (a )?(python|java|javascript|c\+\+|program|code)\b/,
  /\bpython program\b/,
  /\bhomework\b/,
  /\bpolitics\b/,
  /\belection\b/,
  /\bcricket\b/,
  /\bfootball match\b/,
  /\bpremier league\b/,
  /\bnetflix\b/,
  /\bmovie recommendation\b/,
  /\blyrics\b/,
  /\bjoke\b/,
  /\bpoem\b/,
  /\bdiagnos(e|is)\b/,
  /\bprescription\b/,
  /\blawsuit\b/,
  /\bstock tip\b/,
  /\bbitcoin\b/,
  /\bgeneral life advice\b/,
  /\bwhat is (chatgpt|openai|claude|gemini)\b/,
];

const UNKNOWN_FEATURE_PATTERNS: readonly RegExp[] = [
  /\badmin (panel|dashboard|login)\b/,
  /\bmoderation dashboard\b/,
  /\bpush notification/,
  /\bindoor map\b/,
  /\bgps navigation\b/,
  /\bgoogle classroom\b/,
  /\blive human (agent|support)\b/,
  /\bcomment on (a )?room\b/,
  /\bcommunity posts?\b/,
  /\bforum post\b/,
  /\bsms alert/,
  /\bwhatsapp (bot|alert)/,
  /\blogin with google\b/,
  /\bcreate an account\b/,
  /\bsign up\b/,
];

const SECRET_PATTERNS: readonly RegExp[] = [
  /\bdatabase[_ ]url\b/,
  /\bcron[_ ]secret\b/,
  /\b\.env\b/,
  /\benv file\b/,
  /\benvironment variables?\b/,
  /\bapi[_ ]key\b/,
  /\bconnection string\b/,
  /\bbearer (token|secret)\b/,
  /\bshow me (the )?(secret|password|credentials)\b/,
];

export function normalizeHelpText(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  return normalizeHelpText(input)
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export function clampUserMessage(input: string, max = 500): string {
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max);
}

export function isSensitiveProbe(input: string): boolean {
  const n = normalizeHelpText(input);
  return SECRET_PATTERNS.some((pattern) => pattern.test(n));
}

export function hasInScopeTerms(input: string): boolean {
  const n = normalizeHelpText(input);
  return IN_SCOPE_TERMS.some((term) => n.includes(term));
}

export function hasOutOfScopePattern(input: string): boolean {
  const n = normalizeHelpText(input);
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(n));
}

export function isOutOfScope(input: string): boolean {
  if (hasOutOfScopePattern(input)) return true;
  return !hasInScopeTerms(input);
}

export function isUnknownFeature(input: string): boolean {
  const n = normalizeHelpText(input);
  return UNKNOWN_FEATURE_PATTERNS.some((pattern) => pattern.test(n));
}

export function scoreKnowledgeEntry(
  input: string,
  entry: KnowledgeEntry,
): number {
  const n = normalizeHelpText(input);
  if (!n) return 0;

  const question = normalizeHelpText(entry.question);
  if (n === question) return 100;

  for (const alias of entry.aliases ?? []) {
    if (n === normalizeHelpText(alias)) return 96;
  }

  if (n.length >= 12 && (question.includes(n) || n.includes(question))) {
    return 88;
  }

  for (const alias of entry.aliases ?? []) {
    const a = normalizeHelpText(alias);
    if (n.length >= 10 && (n.includes(a) || a.includes(n))) return 84;
  }

  let score = 0;
  for (const keyword of entry.keywords) {
    const k = normalizeHelpText(keyword);
    if (k && n.includes(k)) score += k.split(" ").length >= 2 ? 14 : 8;
  }

  const inputTokens = new Set(tokenize(input));
  const questionTokens = tokenize(entry.question);
  let overlap = 0;
  for (const token of questionTokens) {
    if (inputTokens.has(token)) overlap += 1;
  }
  if (questionTokens.length > 0) {
    score += Math.round((overlap / questionTokens.length) * 20);
  }

  return score;
}

export function matchKnowledge(input: string): {
  entry: KnowledgeEntry;
  score: number;
} | null {
  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const entry of KNOWLEDGE) {
    const score = scoreKnowledgeEntry(input, entry);
    if (!best || score > best.score) best = { entry, score };
  }
  if (!best || best.score < 18) return null;
  return best;
}

export function answerHelpQuestion(raw: string): HelpReply {
  const text = clampUserMessage(raw);
  if (!text) {
    return { kind: "empty", text: MATCH_FALLBACK, entryId: null };
  }

  if (isSensitiveProbe(text)) {
    return { kind: "secret_refusal", text: SECRET_REFUSAL, entryId: null };
  }

  if (hasOutOfScopePattern(text)) {
    return { kind: "out_of_scope", text: SCOPE_REDIRECT, entryId: null };
  }

  const matched = matchKnowledge(text);
  if (matched) {
    return {
      kind: "answer",
      text: matched.entry.answer,
      entryId: matched.entry.id,
    };
  }

  if (isUnknownFeature(text)) {
    return { kind: "unknown_feature", text: UNKNOWN_FEATURE, entryId: null };
  }

  if (!hasInScopeTerms(text)) {
    return { kind: "out_of_scope", text: SCOPE_REDIRECT, entryId: null };
  }

  return { kind: "no_match", text: MATCH_FALLBACK, entryId: null };
}
