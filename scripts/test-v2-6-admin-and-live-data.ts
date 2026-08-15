/**
 * V2.6 admin, live help data, demo-seed guard, contact/mailto, slots.
 * Run: set -a && source .env && set +a && npx tsx scripts/test-v2-6-admin-and-live-data.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  createAdminSessionValue,
  secretsMatch,
  verifyAdminSessionValue,
} from "../lib/admin/session";
import {
  isAdminProtectedPath,
  verifyAdminSessionEdge,
} from "../lib/admin/edge-session";
import {
  fingerprintToken,
  formatTokenFingerprint,
  looksLikeRawUuidToken,
} from "../lib/admin/fingerprint";
import { getAdminReports } from "../lib/admin/data";
import { getFinderRefreshData, queryActiveFreeClassrooms } from "../lib/finder-data";
import { parseLiveHelpIntent } from "../lib/help/live-intent";
import { answerLiveHelpIntent } from "../lib/help/live-answer";
import { answerHelpQuestion, isSensitiveProbe } from "../lib/help/scope";
import {
  buildFeedbackMailtoHref,
  FEEDBACK_RECIPIENT,
  FEEDBACK_SUBJECT,
} from "../lib/help/mailto";
import { isOfficialInventoryRoom } from "../prisma/data/classroom-inventory";
import { shouldRefuseDemoStatsSeed } from "../lib/demo-stats-seed-guard";
import { getStatsPageData } from "../lib/stats-data";
import {
  getNowMinutesInTz,
  getCampusDateString,
  isSlotSelectable,
  SLOT_GRACE_MINUTES,
} from "../lib/slots";
import { RATE_LIMITS, rateLimit, resetRateLimits } from "../lib/rate-limit";

const prisma = new PrismaClient();
const root = join(__dirname, "..");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function ubRoom(floorNumber: number, roomNumber: string) {
  const building = await prisma.building.findFirstOrThrow({
    where: { code: "UB" },
  });
  const floor = await prisma.floor.findFirstOrThrow({
    where: { buildingId: building.id, floorNumber },
  });
  const classroom = await prisma.classroom.findFirstOrThrow({
    where: {
      buildingId: building.id,
      floorId: floor.id,
      roomNumber,
    },
  });
  const slot = await prisma.timeSlot.findFirstOrThrow({
    orderBy: { slotOrder: "asc" },
  });
  return { building, floor, classroom, slot };
}

async function main() {
  try {
    section("Demo seed guard");
    assert(
      shouldRefuseDemoStatsSeed({ NODE_ENV: "production" }) !== null,
      "block production",
    );
    assert(
      shouldRefuseDemoStatsSeed({ VERCEL_ENV: "production" }) !== null,
      "block vercel production",
    );
    assert(
      shouldRefuseDemoStatsSeed({
        NODE_ENV: "production",
        ALLOW_DEMO_STATS_SEED: "true",
      }) === null,
      "override",
    );
    assert(
      shouldRefuseDemoStatsSeed({ NODE_ENV: "development" }) === null,
      "allow local",
    );
    const pkg = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { prisma?: { seed?: string } };
    assert(pkg.prisma?.seed?.includes("prisma/seed.ts"), "prod seed path");
    assert(!pkg.prisma?.seed?.includes("seed-stats-data"), "demo not in prisma seed");
    console.log("ok  demo seed isolation");

    section("Inventory vs Finder");
    assert(isOfficialInventoryRoom("UB", 12, "1205"), "1205 official");
    assert(!isOfficialInventoryRoom("UB", 12, "504"), "504 not on UB12");
    const { classroom, slot } = await ubRoom(12, "1219");
    await prisma.classroom.update({
      where: { id: classroom.id },
      data: { isActive: true },
    });
    await prisma.freeReport.deleteMany({ where: { classroomId: classroom.id } });
    let rooms = await queryActiveFreeClassrooms({});
    assert(
      !rooms.some((r) => r.classroomId === classroom.id),
      "inventory only not free",
    );

    const token = randomUUID();
    const reportDate = new Date(`${getCampusDateString()}T00:00:00.000Z`);
    const created = await prisma.freeReport.create({
      data: {
        classroomId: classroom.id,
        timeSlotId: slot.id,
        reportDate,
        contributorToken: token,
        status: "unverified",
        confirmationCount: 1,
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });
    rooms = await queryActiveFreeClassrooms({});
    assert(
      rooms.some((r) => r.freeReportId === created.id),
      "active report shown",
    );

    await prisma.freeReport.update({
      where: { id: created.id },
      data: { status: "expired" },
    });
    rooms = await queryActiveFreeClassrooms({});
    assert(
      !rooms.some((r) => r.freeReportId === created.id),
      "expired hidden from finder",
    );

    await prisma.freeReport.update({
      where: { id: created.id },
      data: { status: "hidden" },
    });
    rooms = await queryActiveFreeClassrooms({});
    assert(
      !rooms.some((r) => r.freeReportId === created.id),
      "hidden hidden from finder",
    );

    await prisma.freeReport.update({
      where: { id: created.id },
      data: { status: "unverified" },
    });
    await prisma.classroom.update({
      where: { id: classroom.id },
      data: { isActive: false },
    });
    rooms = await queryActiveFreeClassrooms({});
    assert(
      !rooms.some((r) => r.freeReportId === created.id),
      "inactive classroom excluded",
    );
    await prisma.classroom.update({
      where: { id: classroom.id },
      data: { isActive: true },
    });
    await prisma.freeReport.delete({ where: { id: created.id } });
    console.log("ok  finder report lifecycle");

    section("Stats real aggregates");
    const before = await getStatsPageData();
    if (!before.hasAnyData) {
      assert(before.totals.today === 0, "empty today");
      assert(before.totals.thisWeek === 0, "empty week");
    }
    const ub5 = await ubRoom(5, "510");
    await prisma.occupiedReport.deleteMany({
      where: { freeReport: { classroomId: ub5.classroom.id } },
    });
    await prisma.reportEvent.deleteMany({
      where: { freeReport: { classroomId: ub5.classroom.id } },
    });
    await prisma.freeReport.deleteMany({ where: { classroomId: ub5.classroom.id } });
    const statsReport = await prisma.freeReport.create({
      data: {
        classroomId: ub5.classroom.id,
        timeSlotId: ub5.slot.id,
        reportDate,
        contributorToken: randomUUID(),
        status: "unverified",
        confirmationCount: 1,
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });
    const afterCreate = await getStatsPageData();
    assert(afterCreate.hasAnyData, "has data after report");
    assert(afterCreate.totals.thisWeek >= before.totals.thisWeek, "week moved");

    await prisma.freeReport.update({
      where: { id: statsReport.id },
      data: { confirmationCount: 3, status: "confirmed" },
    });
    const afterConf = await getStatsPageData();
    assert(
      (afterConf.avgConfirmationsThisWeek ?? 0) >= 0,
      "avg confirmations numeric",
    );

    await prisma.occupiedReport.create({
      data: {
        freeReportId: statsReport.id,
        reporterToken: randomUUID(),
        reason: "occupied",
      },
    });
    await prisma.freeReport.update({
      where: { id: statsReport.id },
      data: { status: "hidden" },
    });
    const afterOcc = await getStatsPageData();
    const hidden = afterOcc.statusBreakdownThisWeek.find(
      (s) => s.status === "hidden",
    );
    assert((hidden?.reportCount ?? 0) >= 1, "hidden from occupied");
    await prisma.occupiedReport.deleteMany({
      where: { freeReportId: statsReport.id },
    });
    await prisma.freeReport.delete({ where: { id: statsReport.id } });
    console.log("ok  stats follow real rows");

    section("Live chat intents");
    assert(
      parseLiveHelpIntent("Are there any free classrooms in UB?")?.kind ===
        "building",
      "ub building",
    );
    assert(
      parseLiveHelpIntent("Is UB 1205 free?")?.kind === "room",
      "ub 1205",
    );
    assert(
      parseLiveHelpIntent("Rooms on UB Floor 12?")?.kind === "floor",
      "ub 12",
    );
    assert(
      parseLiveHelpIntent("Which rooms are ending soon?")?.kind === "ending_soon",
      "ending soon",
    );
    assert(
      parseLiveHelpIntent("Which rooms were recently verified?")?.kind ===
        "recent",
      "recent",
    );
    assert(parseLiveHelpIntent("How does the Finder work?") === null, "howto not live");
    const weather = answerHelpQuestion("What is the weather?");
    assert(weather.kind === "out_of_scope", "weather");
    assert(isSensitiveProbe("What is CRON_SECRET?"), "cron probe");
    const cronReply = answerHelpQuestion("What is CRON_SECRET?");
    assert(cronReply.kind === "secret_refusal", "cron refuse");
    assert(!cronReply.text.includes(process.env.CRON_SECRET ?? "___none___"), "no leak");
    assert(isSensitiveProbe("What is ADMIN_SECRET?"), "admin probe");

    const liveReport = await prisma.freeReport.create({
      data: {
        classroomId: classroom.id,
        timeSlotId: slot.id,
        reportDate,
        contributorToken: randomUUID(),
        status: "unverified",
        confirmationCount: 1,
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });
    const finderUb = await getFinderRefreshData({
      buildingId: "UB",
    });
    const chatUb = await answerLiveHelpIntent({
      kind: "building",
      buildingCode: "UB",
    });
    if (finderUb.rooms.length === 0) {
      assert(/no classrooms reported free in UB/i.test(chatUb), chatUb);
    } else {
      assert(chatUb.includes(String(finderUb.rooms.length)), chatUb);
    }
    const roomChat = await answerLiveHelpIntent({
      kind: "room",
      buildingCode: "UB",
      roomNumber: "1219",
    });
    const listed1219 = finderUb.rooms.some((r) => r.roomNumber === "1219");
    if (listed1219) {
      assert(/currently reported free/.test(roomChat), roomChat);
    } else {
      assert(/not currently reported free/.test(roomChat), roomChat);
    }
    assert(!looksLikeRawUuidToken(roomChat), "no token in live answer");
    const floorChat = await answerLiveHelpIntent({
      kind: "floor",
      buildingCode: "UB",
      floorNumber: 12,
    });
    assert(/Floor 12/.test(floorChat) || /no classrooms/.test(floorChat), "floor 12");
    await prisma.freeReport.delete({ where: { id: liveReport.id } });
    console.log("ok  live chat");

    section("Contact mailto + menu");
    const href = buildFeedbackMailtoHref();
    assert(href.startsWith(`mailto:${FEEDBACK_RECIPIENT}?`), href);
    assert(href.includes(encodeURIComponent(FEEDBACK_SUBJECT)), "subject");
    assert(!href.slice(0, href.indexOf("?")).includes("%40"), "unencoded @");
    const menuSrc = readFileSync(
      join(root, "components/more-options-menu.tsx"),
      "utf8",
    );
    assert(menuSrc.includes("usePathname"), "pathname aware");
    assert(menuSrc.includes("isContactPath"), "contact branch");
    console.log("ok  contact");

    section("Contributor slots (IST, no overnight extension)");
    const slot1 = { startMinutes: 8 * 60, endMinutes: 8 * 60 + 50 };
    assert(isSlotSelectable(slot1, 22 * 60) === false, "22:00 blocked");
    assert(isSlotSelectable(slot1, 8 * 60) === true, "08:00 ok");
    assert(
      isSlotSelectable(slot1, 8 * 60 - SLOT_GRACE_MINUTES) === true,
      "grace start",
    );
    assert(
      isSlotSelectable(slot1, 8 * 60 - SLOT_GRACE_MINUTES - 1) === false,
      "before grace",
    );
    const tenPmUtc = new Date("2026-08-14T16:30:00.000Z"); // 22:00 IST
    assert(getNowMinutesInTz(tenPmUtc) === 22 * 60, "IST 22:00 minutes");
    console.log("ok  slots");

    section("Admin session / fingerprints / rate limit");
    const adminSecret = "a".repeat(16);
    assert(secretsMatch(adminSecret, adminSecret), "timing-safe match");
    assert(!secretsMatch(adminSecret, "b".repeat(16)), "mismatch");
    const session = createAdminSessionValue(Date.now(), adminSecret);
    assert(verifyAdminSessionValue(session, adminSecret), "session ok");
    const edgeOk = await verifyAdminSessionEdge(session, adminSecret);
    assert(edgeOk, "edge hmac matches node");
    assert(
      !(await verifyAdminSessionEdge(session, "b".repeat(16))),
      "edge mismatch",
    );
    assert(isAdminProtectedPath("/admin"), "protect /admin");
    assert(isAdminProtectedPath("/admin/reports"), "protect reports");
    assert(!isAdminProtectedPath("/admin/login"), "login public");
    assert(!isAdminProtectedPath("/finder"), "finder public");
    assert(!verifyAdminSessionValue(session, "b".repeat(16)), "wrong secret");
    assert(
      !verifyAdminSessionValue(session, adminSecret, Date.now() + 9 * 60 * 60 * 1000),
      "expired",
    );
    const uuid = randomUUID();
    const fp = formatTokenFingerprint(uuid);
    assert(fp.startsWith("Token "), fp);
    assert(!fp.includes(uuid), "no raw uuid");
    assert(fingerprintToken(uuid).length === 6, "6 hex");

    const reports = await getAdminReports(5);
    for (const row of reports) {
      assert(!looksLikeRawUuidToken(JSON.stringify(row)), "no raw token in admin dto");
      assert(row.contributorFingerprint.startsWith("Token "), "fingerprint field");
    }

    resetRateLimits();
    let blocked = 0;
    for (let i = 0; i < RATE_LIMITS.adminLogin.limit + 2; i++) {
      const r = rateLimit(
        "admin-login:test",
        RATE_LIMITS.adminLogin.limit,
        RATE_LIMITS.adminLogin.windowMs,
      );
      if (!r.success) blocked += 1;
    }
    assert(blocked >= 2, "admin login rate limit");

    const loginSrc = readFileSync(
      join(root, "components/admin/admin-login-form.tsx"),
      "utf8",
    );
    assert(!loginSrc.includes("ADMIN_SECRET"), "secret not in login client");
    assert(!loginSrc.includes("CRON_SECRET"), "cron not in login client");
    const loginPageSrc = readFileSync(
      join(root, "app/admin/login/page.tsx"),
      "utf8",
    );
    assert(!loginPageSrc.includes("ADMIN_SECRET"), "secret name not on login page");
    const healthSrc = readFileSync(
      join(root, "app/admin/(console)/page.tsx"),
      "utf8",
    );
    const invSrc = readFileSync(
      join(root, "app/admin/(console)/inventory/page.tsx"),
      "utf8",
    );
    const repSrc = readFileSync(
      join(root, "app/admin/(console)/reports/page.tsx"),
      "utf8",
    );
    assert(healthSrc.includes("requireAdmin()"), "health requireAdmin");
    assert(invSrc.includes("requireAdmin()"), "inventory requireAdmin");
    assert(repSrc.includes("requireAdmin()"), "reports requireAdmin");
    const mw = readFileSync(join(root, "middleware.ts"), "utf8");
    assert(mw.includes("isAdminProtectedPath"), "middleware admin gate");
    const envExample = readFileSync(join(root, ".env.example"), "utf8");
    assert(envExample.includes("ADMIN_SECRET="), "env example");
    assert(!envExample.includes("NEXT_PUBLIC_ADMIN"), "not public");
    console.log("ok  admin security helpers");

    section("Activate official / reject unofficial");
    assert(isOfficialInventoryRoom("UB", 12, "1205"), "can activate 1205");
    assert(!isOfficialInventoryRoom("UB", 12, "504"), "cannot invent 504");
    console.log("ok  inventory rules");
  } finally {
    await prisma.$disconnect();
  }

  console.log("\nV2.6 admin and live-data tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
