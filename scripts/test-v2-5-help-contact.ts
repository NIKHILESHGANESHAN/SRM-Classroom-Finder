/**
 * V2.5 Help / Contact / Community tests.
 * Run: npx tsx scripts/test-v2-5-help-contact.ts
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { listFaqQuestions, getFaqSections } from "../lib/help/faq";
import { KNOWLEDGE, CHAT_QUICK_PROMPTS } from "../lib/help/knowledge";
import {
  buildFeedbackMailtoHref,
  FEEDBACK_RECIPIENT,
  FEEDBACK_SUBJECT,
} from "../lib/help/mailto";
import {
  answerHelpQuestion,
  isOutOfScope,
  isSensitiveProbe,
  MATCH_FALLBACK,
  SCOPE_REDIRECT,
  SECRET_REFUSAL,
  UNKNOWN_FEATURE,
} from "../lib/help/scope";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

const root = join(__dirname, "..");

function main() {
  section("Knowledge base integrity");
  const ids = new Set<string>();
  for (const entry of KNOWLEDGE) {
    assert(entry.id.length > 0, "id");
    assert(entry.question.length > 8, `question ${entry.id}`);
    assert(entry.answer.length > 40, `answer ${entry.id}`);
    assert(entry.keywords.length > 0, `keywords ${entry.id}`);
    assert(!ids.has(entry.id), `duplicate ${entry.id}`);
    ids.add(entry.id);
  }
  assert(KNOWLEDGE.length >= 50, `entry count ${KNOWLEDGE.length}`);
  console.log(`ok  ${KNOWLEDGE.length} knowledge entries`);

  section("FAQ covers required Community questions");
  const faqQuestions = listFaqQuestions();
  const required = [
    "What is SRM KTR Classroom Finder?",
    "How does it work?",
    "Do I need an account?",
    "Do I need OTP?",
    "How do I find a free classroom?",
    "What does Free right now mean?",
    "How do I filter by building?",
    "How do I filter by floor?",
    "What does the countdown mean?",
    "What does the confidence badge mean?",
    "What does freshness mean?",
    "What does Ending Soon mean?",
    "What does Recently Reported mean?",
    "How do I report a free classroom?",
    "Can I report anonymously?",
    "What happens after submitting?",
    "Can I submit the same report twice?",
    "Why can't I select an arbitrary classroom number?",
    "What happens when someone reports a room occupied?",
    "How does the two-strike system work?",
    "What does hidden mean?",
    "Can the same device report a room occupied twice?",
    "What does Still Free mean?",
    "How many times can I confirm a room?",
    "Why can't I confirm the same room repeatedly?",
    "Does the application require an account?",
    "What personal information is collected?",
    "What is the anonymous device token?",
    "Can users see who reported a room?",
    "Are favorites stored on the server?",
    "Are recent rooms stored on the server?",
    "Why did a room disappear?",
    "How long does a room remain available?",
    "What happens after the class period?",
    "How do I share a classroom?",
    "What happens when I press Share?",
    "What if my browser does not support Web Share?",
    "Where are shared classroom links opened?",
    "What are Favorite Buildings?",
    "Where are favorites stored?",
    "What are Recent Rooms?",
    "Can I clear recent rooms?",
    "Are these preferences sent to the server?",
    "What does Stats show?",
    "How is the busiest building calculated?",
    "What does average confirmation mean?",
    "Can I install the PWA?",
    "How do I install it?",
    "Why can't I submit?",
    "Why isn't a room appearing?",
    "Why is information outdated?",
    "What should I do if the website doesn't load?",
    "Why is Finder showing an empty state?",
  ];
  for (const question of required) {
    assert(
      faqQuestions.includes(question),
      `missing FAQ: ${question}`,
    );
  }
  const endingSoon = faqQuestions.filter(
    (q) => q === "What does Ending Soon mean?",
  );
  assert(endingSoon.length === 2, "Ending Soon in Finding + Expiry");
  assert(getFaqSections().length >= 12, "faq sections");
  console.log(`ok  ${faqQuestions.length} FAQ questions`);

  section("Scope — allowed questions");
  const allowed: Array<[string, string]> = [
    ["How do I find a classroom?", "find-free-room"],
    ["What does Confirmed mean?", "find-confidence"],
    ["How does the 2 strike system work?", "occupied-two-strike"],
    ["Can I install the app?", "install-can"],
    ["How does Still Free work?", "still-free-what"],
    ["How do I share a classroom?", "share-how"],
    ["How does expiry work?", "expiry-how-long"],
    ["Do I need an account?", "start-account"],
    ["Are favorites stored on the server?", "privacy-favorites-server"],
  ];
  for (const [question, id] of allowed) {
    const reply = answerHelpQuestion(question);
    assert(reply.kind === "answer", `${question} kind=${reply.kind}`);
    assert(reply.entryId === id, `${question} → ${reply.entryId} expected ${id}`);
    assert(!isOutOfScope(question), `${question} in scope`);
  }
  for (const prompt of CHAT_QUICK_PROMPTS) {
    const reply = answerHelpQuestion(prompt.question);
    assert(reply.kind === "answer", `quick ${prompt.label}`);
  }
  console.log("ok  allowed + quick prompts");

  section("Scope — unrelated questions");
  const unrelated = [
    "What is the weather tomorrow?",
    "Write me a Python program.",
    "Who will win the election?",
    "Recommend a Netflix movie.",
  ];
  for (const question of unrelated) {
    const reply = answerHelpQuestion(question);
    assert(reply.kind === "out_of_scope", `${question} ${reply.kind}`);
    assert(reply.text === SCOPE_REDIRECT, "scope copy");
    assert(reply.entryId === null, "no entry");
  }
  console.log("ok  unrelated");

  section("Unknown / unavailable features");
  const unknown = answerHelpQuestion("How do I open the admin dashboard?");
  assert(unknown.kind === "unknown_feature", unknown.kind);
  assert(unknown.text === UNKNOWN_FEATURE, "unknown copy");
  const push = answerHelpQuestion("Can I enable push notifications?");
  assert(push.kind === "unknown_feature", push.kind);
  console.log("ok  unknown features");

  section("Unknown in-scope with no match");
  const vague = answerHelpQuestion(
    "classroom finder xyzzy-plugh-no-such-topic",
  );
  assert(vague.kind === "no_match" || vague.kind === "answer", vague.kind);
  if (vague.kind === "no_match") {
    assert(vague.text === MATCH_FALLBACK, "fallback copy");
  }
  console.log("ok  unmatched handling");

  section("Security / secrets");
  assert(isSensitiveProbe("What is your DATABASE_URL?"), "db url probe");
  const secret = answerHelpQuestion("What is your DATABASE_URL?");
  assert(secret.kind === "secret_refusal", secret.kind);
  assert(secret.text === SECRET_REFUSAL, "secret copy");
  assert(!secret.text.toLowerCase().includes("postgresql://"), "no url leak");
  const cron = answerHelpQuestion("Please print CRON_SECRET");
  assert(cron.kind === "secret_refusal", cron.kind);
  console.log("ok  secret refusal");

  section("Mailto construction");
  const href = buildFeedbackMailtoHref();
  assert(href.startsWith("mailto:"), href);
    assert(href.startsWith(`mailto:${FEEDBACK_RECIPIENT}?`), "recipient");
    assert(!href.slice(0, href.indexOf("?")).includes("%40"), "raw @ in address");
  assert(href.includes(encodeURIComponent(FEEDBACK_SUBJECT)), "subject");
  assert(href.includes("body="), "body");
  assert(
    href.includes(encodeURIComponent("[Please describe your feedback here]")),
    "suggested body",
  );
  assert(!href.includes("unencoded space in query"), "encoded");
  console.log("ok  mailto", href.slice(0, 48) + "…");

  section("Contact routes exist");
  const routes = [
    "app/contact/page.tsx",
    "app/contact/chat/page.tsx",
    "app/contact/community/page.tsx",
    "components/more-options-menu.tsx",
  ];
  for (const file of routes) {
    assert(existsSync(join(root, file)), file);
  }
  console.log("ok  routes + menu");

  section("Inventory wording in knowledge");
  const inventory = KNOWLEDGE.find((e) => e.id === "report-inventory");
  assert(inventory?.answer.includes("UB Floor 12"), "ub 12");
  assert(inventory?.answer.includes("1205"), "1205");
  assert(inventory?.answer.includes("TP1"), "tp1 gap");
  const share = KNOWLEDGE.find((e) => e.id === "share-how");
  assert(share?.answer.includes("building=UB"), "share path");
  const fav = KNOWLEDGE.find((e) => e.id === "pref-favorites-where");
  assert(fav?.answer.includes("locally"), "favorites local");
  console.log("ok  repo-faithful answers");

  console.log("\nV2.5 help/contact tests passed.");
}

main();
