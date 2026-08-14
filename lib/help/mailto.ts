/**
 * Feedback mailto helper (V2.5).
 * Opens the user's email client — never sends mail from the server.
 */

export const FEEDBACK_RECIPIENT = "arthurknox007@gmail.com";

export const FEEDBACK_SUBJECT = "SRM KTR Classroom Finder — Feedback";

export const FEEDBACK_BODY = [
  "Hello SRM KTR Classroom Finder Team,",
  "",
  "I would like to share the following feedback:",
  "",
  "[Please describe your feedback here]",
  "",
  "Page / feature:",
  "[Optional]",
  "",
  "Device / browser:",
  "[Optional]",
  "",
  "Thank you.",
].join("\n");

export function buildMailtoHref(args: {
  to: string;
  subject: string;
  body: string;
}): string {
  const to = args.to.trim();
  // Leave `@` unencoded in the address — some OS mail handlers ignore mailto:%40…
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(to)) {
    throw new Error("Invalid feedback recipient.");
  }
  const query = [
    `subject=${encodeURIComponent(args.subject)}`,
    `body=${encodeURIComponent(args.body)}`,
  ].join("&");
  return `mailto:${to}?${query}`;
}

export function buildFeedbackMailtoHref(): string {
  return buildMailtoHref({
    to: FEEDBACK_RECIPIENT,
    subject: FEEDBACK_SUBJECT,
    body: FEEDBACK_BODY,
  });
}
