/**
 * Curated Classroom Finder knowledge (V2.5).
 * Shared by the Community FAQ and the controlled help chatbot.
 * Answers describe repository behavior only — no invented features.
 */

export const HELP_CATEGORIES = [
  "Getting Started",
  "Finding Classrooms",
  "Reporting",
  "Occupied Reports",
  "Still Free",
  "Privacy",
  "Expiry",
  "Sharing",
  "Personalization",
  "Statistics",
  "Installation",
  "Troubleshooting",
  "Contact",
  "Project",
] as const;

export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export type KnowledgeEntry = {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
  keywords: readonly string[];
  aliases?: readonly string[];
};

export const KNOWLEDGE: readonly KnowledgeEntry[] = [
  {
    id: "start-what-is",
    category: "Getting Started",
    question: "What is SRM KTR Classroom Finder?",
    answer:
      "SRM KTR Classroom Finder is a campus web app for SRM Institute of Science and Technology, Kattankulathur. Students anonymously report empty classrooms in UB, Tech Park 1 (TP1), and Tech Park 2 (TP2). Classmates browse those reports in Class Finder. It is a DBMS coursework project and does not use accounts.",
    keywords: [
      "what is",
      "classroom finder",
      "srm",
      "ktr",
      "app",
      "website",
      "about",
    ],
    aliases: ["what is this website", "what is classroom finder"],
  },
  {
    id: "start-how-it-works",
    category: "Getting Started",
    question: "How does it work?",
    answer:
      "Open Class Finder to see rooms students have reported free for the current period. Check freshness and the countdown, then tap Still Free if the room is empty or Report Occupied if it is in use. Two independent occupied reports from different devices hide a listing. Reports also expire when the class period ends. There is no account — an anonymous device token prevents duplicate counts.",
    keywords: [
      "how it works",
      "how does it work",
      "overview",
      "flow",
    ],
    aliases: ["explain the app", "how does classroom finder work"],
  },
  {
    id: "start-account",
    category: "Getting Started",
    question: "Do I need an account?",
    answer:
      "No. SRM KTR Classroom Finder does not require an account, login, or sign-up. You can find rooms, report rooms, share links, and open Stats without creating a user.",
    keywords: ["account", "login", "sign up", "signup", "register", "user"],
    aliases: ["do i need to log in", "is there a login"],
  },
  {
    id: "start-otp",
    category: "Getting Started",
    question: "Do I need OTP?",
    answer:
      "No. There is no OTP, SMS code, or phone verification. Reporting uses an anonymous device token stored in your browser, not a one-time password.",
    keywords: ["otp", "sms", "verification", "phone", "one time"],
    aliases: ["is otp required", "do i need a phone number"],
  },
  {
    id: "find-free-room",
    category: "Finding Classrooms",
    question: "How do I find a free classroom?",
    answer:
      "Open Class Finder from the home page. Filter by building and floor if you want, or leave them open to see more rooms. By default you see rooms reported free for the current time slot (“Free right now”). You can also search by room number. Listings come from student reports — empty inventory or no reports is not the same as every room being occupied.",
    keywords: [
      "find",
      "free classroom",
      "free room",
      "class finder",
      "browse",
      "search",
    ],
    aliases: [
      "how do i find a free room",
      "how do i find a classroom",
      "where can i find empty classrooms",
      "how to find a classroom",
    ],
  },
  {
    id: "find-free-right-now",
    category: "Finding Classrooms",
    question: "What does Free right now mean?",
    answer:
      "“Free right now” means Finder is showing the current campus time slot (Asia/Kolkata). You can browse other slots from the slot filter. Choosing “all slots” shows free reports across periods instead of only the live slot.",
    keywords: ["free right now", "current slot", "this period", "now"],
    aliases: ["what is free right now"],
  },
  {
    id: "find-filter-building",
    category: "Finding Classrooms",
    question: "How do I filter by building?",
    answer:
      "In Class Finder, use the building filter to choose UB, TP1, or TP2. You can star favorite buildings so they sort first, and use “My buildings” to show only starred buildings. Filters are stored in the page URL so you can bookmark or share the same view.",
    keywords: ["filter", "building", "ub", "tp1", "tp2", "star"],
    aliases: ["how to choose a building"],
  },
  {
    id: "find-filter-floor",
    category: "Finding Classrooms",
    question: "How do I filter by floor?",
    answer:
      "Select a building first, then use the floor filter. Floor choices come from that building. Classroom numbers are validated against the verified inventory for that building and floor — a room that exists on another floor is not treated as valid here.",
    keywords: ["filter", "floor", "storey", "level"],
    aliases: ["how to choose a floor"],
  },
  {
    id: "find-countdown",
    category: "Finding Classrooms",
    question: "What does the countdown mean?",
    answer:
      "Each Finder card counts down to when that free report expires — normally the end of the selected class period. When little time remains, Finder may refresh more often so the list stays current. After expiry the room leaves the active list (history is kept for Stats).",
    keywords: ["countdown", "timer", "time left", "expires"],
    aliases: ["what is the timer on a room"],
  },
  {
    id: "find-confidence",
    category: "Finding Classrooms",
    question: "What does the confidence badge mean?",
    answer:
      "The badge is Unverified or Confirmed. Unverified means the listing is still at the original report. Confirmed means independent classmates have backed it (Still Free or another Contributor confirmation) so the report status became confirmed. The badge also shows a confidence level (low / moderate / high) from confirmation count versus occupied corrections. Hidden and expired reports are not shown as Confirmed.",
    keywords: [
      "confidence",
      "badge",
      "confirmed",
      "unverified",
      "high confidence",
    ],
    aliases: [
      "what does confirmed mean",
      "what does unverified mean",
      "what is the confidence badge",
    ],
  },
  {
    id: "find-freshness",
    category: "Finding Classrooms",
    question: "What does freshness mean?",
    answer:
      "Freshness is how recently the room was last verified (the original report or a later Still Free / confirmation). Labels are Very Fresh (under 2 minutes), Fresh (under 10 minutes), Aging (under 30 minutes), and Stale (older than that). It is derived from last verified time — not a separate database status.",
    keywords: ["freshness", "fresh", "stale", "aging", "verified", "last verified"],
    aliases: ["what is freshness", "why does it say stale"],
  },
  {
    id: "find-ending-soon",
    category: "Finding Classrooms",
    question: "What does Ending Soon mean?",
    answer:
      "Ending Soon is a Finder focus filter for rooms whose free report expires within the next 10 minutes. It does not mean the classroom is occupied. Use “All free” to see the full current list.",
    keywords: ["ending soon", "expiring", "about to expire", "focus"],
    aliases: ["what is ending soon"],
  },
  {
    id: "find-recently-reported",
    category: "Finding Classrooms",
    question: "What does Recently Reported mean?",
    answer:
      "Recently Reported is a Finder focus filter for rooms last verified within the last 10 minutes (the Fresh / Very Fresh window). Other free rooms may still be listed under All free.",
    keywords: ["recently reported", "recent reports", "just reported"],
    aliases: ["what is recently reported"],
  },
  {
    id: "report-how",
    category: "Reporting",
    question: "How do I report a free classroom?",
    answer:
      "Open Contributor (home page or “Report a room” in Finder). Choose building, floor, then a classroom from the verified list, then a selectable time slot (current period, within about ±5 minutes of the slot). Submit — no login. You can also open Contributor after spotting an empty room on campus.",
    keywords: [
      "report a room",
      "contributor",
      "submit",
      "report free",
      "how to report",
    ],
    aliases: [
      "how do i report a room",
      "how to contribute",
      "how do i report a free classroom",
    ],
  },
  {
    id: "report-anonymous",
    category: "Reporting",
    question: "Can I report anonymously?",
    answer:
      "Yes. Reports are anonymous. Classmates never see a name, email, or profile. The app only uses a local anonymous device token so the same browser cannot count as two independent confirmations or two occupied strikes on the same listing.",
    keywords: ["anonymous", "anonymously", "without name", "no name"],
    aliases: ["is reporting anonymous"],
  },
  {
    id: "report-after-submit",
    category: "Reporting",
    question: "What happens after submitting?",
    answer:
      "If the room was not already listed for that slot and campus day, a new free report is created as Unverified and appears in Class Finder. If another student already reported it, your submit can count as an independent confirmation (Still Free–style) unless you were the original reporter. If you already submitted that room for the same slot today, you get “already on the board” instead of a duplicate row. There is also a daily cap of about 15 new contributions per device token.",
    keywords: ["after submitting", "what happens", "created", "already on the board"],
    aliases: ["what happens when i submit"],
  },
  {
    id: "report-duplicate",
    category: "Reporting",
    question: "Can I submit the same report twice?",
    answer:
      "You cannot create two free-report rows for the same classroom, time slot, and campus date. If you submit again as the original reporter, the app records that it is already reported. Independent classmates can confirm an existing live listing. Retries are designed to be safe (unique constraints), not to spam the board.",
    keywords: ["twice", "duplicate", "same report", "already reported", "retry"],
    aliases: ["can i report the same room twice"],
  },
  {
    id: "report-inventory",
    category: "Reporting",
    question: "Why can't I select an arbitrary classroom number?",
    answer:
      "Classrooms are chosen from the application's verified classroom inventory. You cannot type an arbitrary door number for another floor or invent a room. For example, UB Floor 12 includes 1205 but not 504; 504 on UB Floor 12 is rejected. TP2 Floor 5 does include 504. TP1 floors currently have an inventory gap — no verified room list yet — so you cannot pick TP1 classroom numbers until that list is added.",
    keywords: [
      "arbitrary",
      "inventory",
      "room number",
      "not listed",
      "ub 504",
      "tp1",
    ],
    aliases: [
      "why can't i type a room number",
      "why is my classroom missing",
    ],
  },
  {
    id: "occupied-what",
    category: "Occupied Reports",
    question: "What happens when someone reports a room occupied?",
    answer:
      "Report Occupied files an occupied strike against that free listing (with a reason such as occupied, class in progress, wrong info, or duplicate). One strike does not hide the room. A second occupied report from a different device hides the listing so it leaves Finder. The same device cannot add two strikes.",
    keywords: ["report occupied", "occupied", "wrong", "class in progress"],
    aliases: ["what happens if i report occupied"],
  },
  {
    id: "occupied-two-strike",
    category: "Occupied Reports",
    question: "How does the two-strike system work?",
    answer:
      "Two independent occupied reports from different anonymous device tokens hide a free listing. The hide happens in the same database transaction as the second strike. Hidden rooms are excluded from the active Finder list. Stats can still count historical hidden rows.",
    keywords: ["two strike", "2 strike", "two-strike", "strikes", "hide"],
    aliases: ["how does the 2 strike system work", "what is two strike"],
  },
  {
    id: "occupied-hidden",
    category: "Occupied Reports",
    question: "What does hidden mean?",
    answer:
      "Hidden means a free report was taken off the live Finder board after two independent occupied strikes (or equivalent hide status). It is not shown as a free room. The row is kept in the database for history and Stats, and it is not treated as Confirmed.",
    keywords: ["hidden", "hide", "removed from finder"],
    aliases: ["why is a room hidden"],
  },
  {
    id: "occupied-same-device",
    category: "Occupied Reports",
    question: "Can the same device report a room occupied twice?",
    answer:
      "No. Occupied strikes are unique per free report and device token. A second tap from the same browser is treated as already reported and does not add another strike.",
    keywords: ["same device", "occupied twice", "duplicate occupied"],
    aliases: ["can i report occupied twice"],
  },
  {
    id: "still-free-what",
    category: "Still Free",
    question: "What does Still Free mean?",
    answer:
      "Still Free is an independent confirmation that a listed room is still empty. It updates last-verified time and can raise confirmation count (and move Unverified → Confirmed when the threshold is met). It is anonymous and uses your device token.",
    keywords: ["still free", "confirm", "thumbs up", "still empty"],
    aliases: ["how does still free work", "what is still free"],
  },
  {
    id: "still-free-how-many",
    category: "Still Free",
    question: "How many times can I confirm a room?",
    answer:
      "Each device token can record one Still Free (or equivalent confirmation event) per free listing. Additional taps from the same device return already reported and do not increase the count again. Other classmates can still confirm from their own devices. Burst rate limits also apply if you tap too quickly.",
    keywords: ["how many times", "confirm a room", "multiple confirmations"],
    aliases: ["can i still free more than once"],
  },
  {
    id: "still-free-repeat",
    category: "Still Free",
    question: "Why can't I confirm the same room repeatedly?",
    answer:
      "Confirmations are unique per listing and device token (database unique constraint on the event). That keeps one person from inflating confidence. If you already confirmed or you were the original reporter on a path that blocks a second count, the app records already reported instead of adding another confirmation.",
    keywords: ["repeatedly", "again", "already confirmed", "duplicate still free"],
    aliases: ["why can't i press still free twice"],
  },
  {
    id: "privacy-account",
    category: "Privacy",
    question: "Does the application require an account?",
    answer:
      "No. There is no user table, login, or OTP. Anyone with the website can use Finder, Contributor, Stats, sharing, and Help.",
    keywords: ["require an account", "privacy account", "authentication"],
    aliases: ["is there authentication"],
  },
  {
    id: "privacy-personal",
    category: "Privacy",
    question: "What personal information is collected?",
    answer:
      "The app does not collect names, email addresses, or phone numbers for reporting. It stores an anonymous device token in a first-party cookie and localStorage to prevent duplicate reports. Favorites and recent rooms stay only in your browser. Chat conversations are not saved to the database. Feedback uses your own email app via mailto and is not stored in PostgreSQL by this website.",
    keywords: [
      "personal information",
      "pii",
      "email",
      "name",
      "collected",
      "data",
    ],
    aliases: ["what data do you collect"],
  },
  {
    id: "privacy-token",
    category: "Privacy",
    question: "What is the anonymous device token?",
    answer:
      "A random UUID created in your browser and stored as cookie `classroomfinder_token` plus localStorage. Server actions read it to apply uniqueness, daily contribution caps, and occupied/Still Free rules. It is not a login. Classmates cannot see your token. Clearing site data may mint a new token.",
    keywords: ["device token", "uuid", "cookie", "classroomfinder_token"],
    aliases: ["what is the device token", "what is the anonymous token"],
  },
  {
    id: "privacy-who-reported",
    category: "Privacy",
    question: "Can users see who reported a room?",
    answer:
      "No. Finder cards show building, floor, room, freshness, confidence, and countdown — not names, emails, or tokens.",
    keywords: ["who reported", "see who", "identity", "name on report"],
    aliases: ["is the reporter public"],
  },
  {
    id: "privacy-favorites-server",
    category: "Privacy",
    question: "Are favorites stored on the server?",
    answer:
      "No. Favorite buildings are stored locally in your browser (localStorage). They are not stored in the Classroom Finder database and are not sent as a preference payload to the server.",
    keywords: ["favorites stored", "server favorites", "star buildings"],
    aliases: ["are favorite buildings uploaded"],
  },
  {
    id: "privacy-recent-server",
    category: "Privacy",
    question: "Are recent rooms stored on the server?",
    answer:
      "No. Recent rooms are stored locally in your browser and are not sent to the Classroom Finder server. You can clear them with “Clear history” on Finder.",
    keywords: ["recent rooms stored", "server recents", "history"],
    aliases: ["does the server save recent rooms"],
  },
  {
    id: "expiry-disappear",
    category: "Expiry",
    question: "Why did a room disappear?",
    answer:
      "A room leaves Finder when its free report expires at period end, when two independent occupied reports hide it, when you applied a filter/search that excludes it, or when it was never a valid inventory room for that building and floor. Finder also refreshes on a timer; a failed refresh keeps showing recent data until the next successful update.",
    keywords: ["disappear", "gone", "missing room", "left the list"],
    aliases: ["why did my room vanish"],
  },
  {
    id: "expiry-how-long",
    category: "Expiry",
    question: "How long does a room remain available?",
    answer:
      "A free report remains on the live board until its `expires_at` time — the end of the reported class period — unless it is hidden earlier by two occupied strikes. Cron also marks past-due reports expired about every five minutes, and the active view ignores expired and hidden rows.",
    keywords: ["how long", "remain available", "duration", "until when", "expiry"],
    aliases: ["how long is a report valid", "how does expiry work"],
  },
  {
    id: "expiry-after-period",
    category: "Expiry",
    question: "What happens after the class period?",
    answer:
      "When the period ends, the report is marked expired (cron plus the expiry timestamp). It disappears from Class Finder but remains in the database for Stats history. You can report the room again in a later selectable slot.",
    keywords: ["after the class period", "period ends", "expired"],
    aliases: ["what happens when the slot ends"],
  },
  {
    id: "expiry-ending-soon",
    category: "Expiry",
    question: "What does Ending Soon mean?",
    answer:
      "Ending Soon lists rooms whose free reports expire within 10 minutes. It is a Finder filter, not a new database status. After the countdown hits zero the listing is no longer treated as currently free.",
    keywords: ["ending soon expiry", "last ten minutes"],
    aliases: ["ending soon after expiry"],
  },
  {
    id: "share-how",
    category: "Sharing",
    question: "How do I share a classroom?",
    answer:
      "On a Finder room card, tap Share. That builds a human-readable Class Finder link such as `/finder?building=UB&floor=12&room=1205`. Share does not include device tokens, report IDs, or slot/focus state. The person who opens it sees the current slot like a normal Finder visit. Invalid inventory rooms (for example UB Floor 12 room 504) are not treated as a listed classroom.",
    keywords: ["share", "sharing", "send room", "link"],
    aliases: ["how do i share a classroom", "how to share a room"],
  },
  {
    id: "share-press",
    category: "Sharing",
    question: "What happens when I press Share?",
    answer:
      "Supported browsers can open the Web Share sheet with a short message and the Finder URL. If Web Share is unavailable or fails, the app copies the link to the clipboard instead. Cancelling the share sheet is not treated as an error. Sharing a valid room also remembers it in local recent rooms.",
    keywords: ["press share", "web share", "clipboard"],
    aliases: ["what does the share button do"],
  },
  {
    id: "share-no-webshare",
    category: "Sharing",
    question: "What if my browser does not support Web Share?",
    answer:
      "The link is copied to the clipboard when possible so you can paste it into chat or email. If copying is blocked, Share reports a failure — you can still copy the address bar after opening the same filters.",
    keywords: ["no web share", "clipboard", "unsupported"],
    aliases: ["share not working"],
  },
  {
    id: "share-where-open",
    category: "Sharing",
    question: "Where are shared classroom links opened?",
    answer:
      "They open Class Finder (`/finder`) with building, floor, and room query parameters. If the room is in inventory, Finder can highlight it and remember it locally when it is still reported free. If it is no longer free, you see a status message. Links never carry your device token.",
    keywords: ["shared link", "deep link", "open share"],
    aliases: ["where does the share link go"],
  },
  {
    id: "pref-favorites",
    category: "Personalization",
    question: "What are Favorite Buildings?",
    answer:
      "You can star buildings in Finder. Favorites sort toward the top of the building list and power the “My buildings” focus. Stars are a local preference only.",
    keywords: ["favorite buildings", "star", "my buildings"],
    aliases: ["what are favorites"],
  },
  {
    id: "pref-favorites-where",
    category: "Personalization",
    question: "Where are favorites stored?",
    answer:
      "Favorite buildings are stored locally in your browser. They are not stored in the Classroom Finder database.",
    keywords: ["where favorites", "localstorage favorites"],
    aliases: ["where do you save favorites"],
  },
  {
    id: "pref-recent",
    category: "Personalization",
    question: "What are Recent Rooms?",
    answer:
      "Finder keeps a short local list (up to 8) of rooms you shared or opened from a valid deep link. Tapping one jumps to that classroom’s Finder link.",
    keywords: ["recent rooms", "history", "last rooms"],
    aliases: ["what is recent rooms"],
  },
  {
    id: "pref-clear-recent",
    category: "Personalization",
    question: "Can I clear recent rooms?",
    answer:
      "Yes. Use “Clear history” next to Recent rooms on Class Finder. That only clears local browser storage for this preference.",
    keywords: ["clear recent", "clear history"],
    aliases: ["how do i clear recent rooms"],
  },
  {
    id: "pref-sent-server",
    category: "Personalization",
    question: "Are these preferences sent to the server?",
    answer:
      "No. Favorite buildings and recent rooms stay on your device. Finder filters in the URL (building, floor, slot, focus, room) are just navigation parameters — they are not an account profile.",
    keywords: ["preferences sent", "sync", "upload preferences"],
    aliases: ["do preferences go to the database"],
  },
  {
    id: "stats-what",
    category: "Statistics",
    question: "What does Stats show?",
    answer:
      "Stats is a public dashboard of aggregate SQL over free reports: counts today and this week, busiest building today, most active slot this week, reports per building, average confirmation count this week, status breakdown, and top classrooms reported more than once. If nobody has reported yet, it shows an empty state.",
    keywords: ["stats", "statistics", "dashboard", "aggregates"],
    aliases: ["what is the stats page"],
  },
  {
    id: "stats-busiest",
    category: "Statistics",
    question: "How is the busiest building calculated?",
    answer:
      "Stats runs a SQL GROUP BY building with COUNT of free reports for campus today and takes the top building (LIMIT 1). It is an aggregate of reports, not a live occupancy sensor.",
    keywords: ["busiest building", "group by", "count"],
    aliases: ["which building is busiest"],
  },
  {
    id: "stats-avg",
    category: "Statistics",
    question: "What does average confirmation mean?",
    answer:
      "It is the SQL AVG of `confirmation_count` on free reports dated this campus week (rounded to one decimal). It summarizes how much independent confirmation listings received, including historical rows — not only rooms still on Finder.",
    keywords: ["average confirmation", "avg confirmation", "mean confirmations"],
    aliases: ["what is average confirmation"],
  },
  {
    id: "install-can",
    category: "Installation",
    question: "Can I install the PWA?",
    answer:
      "Yes. SRM KTR Classroom Finder is an installable Progressive Web App (manifest, icons, and a service worker). You can add it to your home screen from a supporting browser. Installation is optional — the website works in the browser without installing.",
    keywords: ["pwa", "install", "add to home screen", "app"],
    aliases: ["can i install the app", "is this a pwa"],
  },
  {
    id: "install-how",
    category: "Installation",
    question: "How do I install it?",
    answer:
      "In Chrome or Edge, use the install / “Add to Home Screen” control in the browser menu when the site is eligible. On iPhone Safari, use Share → Add to Home Screen. The app can display in standalone mode after install. There is no App Store listing in this project.",
    keywords: ["how to install", "home screen", "safari", "chrome"],
    aliases: ["install on phone"],
  },
  {
    id: "trouble-submit",
    category: "Troubleshooting",
    question: "Why can't I submit?",
    answer:
      "Common causes: missing device token (refresh the page), the time slot is outside the ±5 minute reporting window, the classroom is not in inventory for that floor, the daily contribution cap (~15 new reports) was reached, or a short rate limit (“Too many requests”). Network failures show that the report could not be submitted — try again. Hidden or expired existing rows cannot be resurrected as a duplicate new listing the same day.",
    keywords: ["can't submit", "cannot submit", "submit failed", "error reporting"],
    aliases: ["why is submit blocked"],
  },
  {
    id: "trouble-not-appearing",
    category: "Troubleshooting",
    question: "Why isn't a room appearing?",
    answer:
      "Finder only lists active free reports for your filters (not hidden, not expired). The room may have no report this slot, may have expired, may be hidden after two occupied strikes, may not be in inventory (especially TP1), or your search/focus filter may exclude it. Empty does not always mean occupied.",
    keywords: ["isn't appearing", "not showing", "not on finder"],
    aliases: ["why don't i see a room"],
  },
  {
    id: "trouble-outdated",
    category: "Troubleshooting",
    question: "Why is information outdated?",
    answer:
      "Finder polls about every 20 seconds while the tab is visible (about 10 seconds if a visible room expires within 5 minutes). Polling pauses when the tab is hidden. If a refresh fails you will see “Unable to refresh — showing recent data.” Freshness on each card also tells you when that room was last verified. Use Still Free or Report Occupied to update a listing you can see.",
    keywords: ["outdated", "stale data", "not updating", "polling"],
    aliases: ["why isn't finder updating"],
  },
  {
    id: "trouble-load",
    category: "Troubleshooting",
    question: "What should I do if the website doesn't load?",
    answer:
      "Check your network, try a refresh, or reopen the home page. If a page errors, use Back home / Class Finder. This app needs its database in production — a down database can fail Finder, Contributor, and Stats. Help, Contact, and Community knowledge do not require chatting with an external AI.",
    keywords: ["doesn't load", "blank", "error page", "website down"],
    aliases: ["site not loading"],
  },
  {
    id: "trouble-empty",
    category: "Troubleshooting",
    question: "Why is Finder showing an empty state?",
    answer:
      "Empty states are honest: no rooms reported free; not enough reports for that floor; an inventory gap (no verified rooms, e.g. TP1); search miss; no recently reported rooms; no ending-soon rooms; or no starred buildings for “My buildings.” None of these claim that every physical classroom is occupied.",
    keywords: ["empty state", "no rooms", "inventory gap", "none free"],
    aliases: ["why is finder empty"],
  },
  {
    id: "contact-chat",
    category: "Contact",
    question: "How do I get help in chat?",
    answer:
      "Open More options → Contact us, then Chat with us (`/contact/chat`). The Classroom Finder Assistant only answers questions about this website. It uses a local knowledge base — not ChatGPT or any paid AI API. Refreshing the page clears the conversation; nothing is stored in PostgreSQL.",
    keywords: ["chat", "assistant", "help bot", "contact chat"],
    aliases: ["how do i chat with you"],
  },
  {
    id: "contact-feedback",
    category: "Contact",
    question: "How do I send feedback?",
    answer:
      "On Contact us, choose Send feedback. That opens your email app to arthurknox007@gmail.com with subject “SRM KTR Classroom Finder — Feedback” and a suggested body you can edit. The website does not send email itself and does not store feedback in the database.",
    keywords: ["feedback", "mailto", "email", "contact"],
    aliases: ["how do i email you", "send feedback"],
  },
  {
    id: "contact-community",
    category: "Contact",
    question: "What is Community?",
    answer:
      "Community (`/contact/community`) is a curated FAQ. It is not a public forum: there are no accounts, comments, or user posts. Answers are the same knowledge source the help assistant uses.",
    keywords: ["community", "faq", "questions"],
    aliases: ["what is the community page"],
  },
  {
    id: "project-dbms",
    category: "Project",
    question: "What DBMS concepts does this project use?",
    answer:
      "The coursework stack is Next.js with PostgreSQL and Prisma. The schema uses keys, foreign keys, CHECKs, composite uniqueness (for example one free report per classroom + slot + date), indexes, transactions (contribute, Still Free, occupied hide), a SQL view for active free classrooms, and Stats queries with GROUP BY, COUNT, AVG, HAVING, FILTER, and joins. Help itself is static — no extra support tables.",
    keywords: [
      "dbms",
      "database",
      "postgres",
      "prisma",
      "sql",
      "normalization",
      "transaction",
      "schema",
    ],
    aliases: ["what is the database", "explain the schema"],
  },
  {
    id: "finder-polling",
    category: "Finding Classrooms",
    question: "Does Finder update in real time?",
    answer:
      "Finder uses visibility-aware polling, not WebSockets. About every 20 seconds (10 seconds near expiry) it refreshes while the tab is visible, and it pauses when the tab is hidden. That keeps the list current without a live socket service.",
    keywords: ["real time", "polling", "websocket", "live", "refresh"],
    aliases: ["is it realtime", "does it use websockets"],
  },
  {
    id: "how-it-works-page",
    category: "Getting Started",
    question: "Where is How It Works?",
    answer:
      "Open `/how-it-works` from the home page or the How it works link on Class Finder. It is a short guided explanation of Finder, freshness, Still Free, occupied reports, expiry, and anonymity.",
    keywords: ["how it works page", "guide", "tutorial"],
    aliases: ["where is the tutorial"],
  },
];

export const KNOWLEDGE_BY_ID: Readonly<Record<string, KnowledgeEntry>> =
  Object.fromEntries(KNOWLEDGE.map((entry) => [entry.id, entry]));

export const CHAT_QUICK_PROMPTS: readonly {
  label: string;
  question: string;
}[] = [
  { label: "Any free rooms in UB?", question: "Are there any free classrooms in UB?" },
  { label: "How do I find a free room?", question: "How do I find a free room?" },
  { label: "How do I report a room?", question: "How do I report a room?" },
  { label: "What does Confirmed mean?", question: "What does Confirmed mean?" },
  { label: "How does expiry work?", question: "How long does a room remain available?" },
  { label: "How does Still Free work?", question: "How does Still Free work?" },
  { label: "How do I share a classroom?", question: "How do I share a classroom?" },
];
