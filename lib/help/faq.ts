/**
 * Community FAQ grouping — same entries as the chatbot knowledge base.
 */

import {
  KNOWLEDGE_BY_ID,
  type HelpCategory,
  type KnowledgeEntry,
} from "@/lib/help/knowledge";

export type FaqSection = {
  category: HelpCategory;
  entries: KnowledgeEntry[];
};

const FAQ_IDS: Readonly<Record<string, readonly string[]>> = {
  "Getting Started": [
    "start-what-is",
    "start-how-it-works",
    "start-account",
    "start-otp",
  ],
  "Finding Classrooms": [
    "find-free-room",
    "find-free-right-now",
    "find-filter-building",
    "find-filter-floor",
    "find-countdown",
    "find-confidence",
    "find-freshness",
    "find-ending-soon",
    "find-recently-reported",
  ],
  Reporting: [
    "report-how",
    "report-anonymous",
    "report-after-submit",
    "report-duplicate",
    "report-inventory",
  ],
  "Occupied Reports": [
    "occupied-what",
    "occupied-two-strike",
    "occupied-hidden",
    "occupied-same-device",
  ],
  "Still Free": [
    "still-free-what",
    "still-free-how-many",
    "still-free-repeat",
  ],
  Privacy: [
    "privacy-account",
    "privacy-personal",
    "privacy-token",
    "privacy-who-reported",
    "privacy-favorites-server",
    "privacy-recent-server",
  ],
  Expiry: [
    "expiry-disappear",
    "expiry-how-long",
    "expiry-after-period",
    "expiry-ending-soon",
  ],
  Sharing: [
    "share-how",
    "share-press",
    "share-no-webshare",
    "share-where-open",
  ],
  Personalization: [
    "pref-favorites",
    "pref-favorites-where",
    "pref-recent",
    "pref-clear-recent",
    "pref-sent-server",
  ],
  Statistics: ["stats-what", "stats-busiest", "stats-avg"],
  Installation: ["install-can", "install-how"],
  Troubleshooting: [
    "trouble-submit",
    "trouble-not-appearing",
    "trouble-outdated",
    "trouble-load",
    "trouble-empty",
  ],
};

function requireEntry(id: string): KnowledgeEntry {
  const entry = KNOWLEDGE_BY_ID[id];
  if (!entry) {
    throw new Error(`FAQ references unknown knowledge id: ${id}`);
  }
  return entry;
}

export function getFaqSections(): FaqSection[] {
  return Object.entries(FAQ_IDS).map(([category, ids]) => ({
    category: category as HelpCategory,
    entries: ids.map(requireEntry),
  }));
}

export function listFaqQuestions(): string[] {
  return getFaqSections().flatMap((section) =>
    section.entries.map((entry) => entry.question),
  );
}
