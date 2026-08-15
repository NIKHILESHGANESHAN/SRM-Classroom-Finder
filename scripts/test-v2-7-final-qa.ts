/**
 * V2.7 final QA: Chat/Finder slot agreement, cron timing-safe auth, PWA SW, skip-link.
 * Run: set -a && source .env && set +a && npx tsx scripts/test-v2-7-final-qa.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { getFinderRefreshData } from "../lib/finder-data";
import { parseLiveHelpIntent } from "../lib/help/live-intent";
import {
  answerLiveHelpIntent,
  liveFinderFilters,
} from "../lib/help/live-answer";
import { authorizeCronRequest } from "../lib/cron-auth";
import { bearerSecretMatches, secretsMatch } from "../lib/timing-safe";
import { isOfficialInventoryRoom } from "../prisma/data/classroom-inventory";
import {
  getCurrentSlotId,
  getNowMinutesInTz,
  timeToMinutes,
} from "../lib/slots";
import { shouldRefuseDemoStatsSeed } from "../lib/demo-stats-seed-guard";

const prisma = new PrismaClient();
const root = join(__dirname, "..");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function headersOf(map: Record<string, string>) {
  return {
    headers: {
      get(name: string) {
        return map[name.toLowerCase()] ?? null;
      },
    },
  };
}

async function main() {
  try {
    section("PWA service worker");
    const sw = readFileSync(join(root, "public/sw.js"), "utf8");
    assert(sw.includes('CACHE_VERSION = "srm-classroom-finder-v2.7"'), "cache version");
    assert(sw.includes('url.pathname === "/sw.js"'), "sw.js not cache-first");
    assert(sw.includes("keys") && sw.includes("caches.delete"), "old cache cleanup");
    const pwa = readFileSync(join(root, "components/pwa-register.tsx"), "utf8");
    assert(pwa.includes('updateViaCache: "none"'), "register bypasses HTTP cache");
    console.log("ok  pwa");

    section("Skip link");
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
    assert(layout.includes('href="#main-content"'), "skip href");
    assert(layout.includes('id="main-content"'), "main target");
    assert(layout.includes("Skip to main content"), "label");
    console.log("ok  skip link");

    section("Cron timing-safe auth");
    const secret = "cron-secret-value";
    assert(secretsMatch(secret, secret), "match");
    assert(!secretsMatch(secret, "cron-secret-other"), "mismatch");
    assert(bearerSecretMatches(`Bearer ${secret}`, secret), "bearer ok");
    assert(!bearerSecretMatches(`Bearer wrong-secret-xx`, secret), "bearer bad");
    assert(!bearerSecretMatches(null, secret), "missing header");
    assert(!authorizeCronRequest(headersOf({}), secret), "no headers");
    assert(
      authorizeCronRequest(
        headersOf({ authorization: `Bearer ${secret}` }),
        secret,
      ),
      "auth header",
    );
    assert(
      authorizeCronRequest(
        headersOf({ "x-vercel-cron-secret": secret }),
        secret,
      ),
      "vercel header",
    );
    assert(
      !authorizeCronRequest(
        headersOf({ authorization: "Bearer nope" }),
        secret,
      ),
      "wrong bearer",
    );
    console.log("ok  cron auth");

    section("Demo seed still isolated");
    assert(shouldRefuseDemoStatsSeed({ NODE_ENV: "production" }) !== null, "prod");
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      prisma?: { seed?: string };
    };
    assert(!pkg.prisma?.seed?.includes("seed-stats-data"), "not in db:seed");
    console.log("ok  demo seed");

    section("Inventory integrity (no TP1, no UB12/504)");
    assert(isOfficialInventoryRoom("UB", 12, "1205"), "1205");
    assert(!isOfficialInventoryRoom("UB", 12, "504"), "504");
    assert(isOfficialInventoryRoom("TP2", 5, "504"), "tp2 504");
    assert(!isOfficialInventoryRoom("TP1", 1, "101"), "no tp1");
    console.log("ok  inventory");

    section("Chat slot scope parsing");
    const nowQ = parseLiveHelpIntent("Is UB 1205 free?");
    assert(nowQ?.kind === "room" && nowQ.slotScope === "current", "current default");
    const allQ = parseLiveHelpIntent("Are there any free classrooms in UB across all slots?");
    assert(allQ?.kind === "building" && allQ.slotScope === "all", "explicit all");
    assert(liveFinderFilters({ slotScope: "current" }).timeSlotId === undefined, "omit slot");
    assert(liveFinderFilters({ slotScope: "all" }).timeSlotId === "all", "all slot");
    console.log("ok  slot parse");

    section("Chat agrees with Finder");
    const building = await prisma.building.findFirstOrThrow({ where: { code: "UB" } });
    const floor = await prisma.floor.findFirstOrThrow({
      where: { buildingId: building.id, floorNumber: 12 },
    });
    const classroom = await prisma.classroom.findFirstOrThrow({
      where: {
        buildingId: building.id,
        floorId: floor.id,
        roomNumber: "1205",
        isActive: true,
      },
    });
    const slots = await prisma.timeSlot.findMany({ orderBy: { slotOrder: "asc" } });
    const slotFields = slots.map((s) => ({
      id: s.id,
      slotOrder: s.slotOrder,
      startMinutes: timeToMinutes(s.startTime),
      endMinutes: timeToMinutes(s.endTime),
    }));
    const currentSlotId = getCurrentSlotId(slotFields, getNowMinutesInTz());
    const otherSlot = slots.find((s) => s.id !== currentSlotId) ?? slots[1]!;
    const currentSlot =
      slots.find((s) => s.id === currentSlotId) ?? null;

    await prisma.occupiedReport.deleteMany({
      where: { freeReport: { classroomId: classroom.id } },
    });
    await prisma.reportEvent.deleteMany({
      where: { freeReport: { classroomId: classroom.id } },
    });
    await prisma.freeReport.deleteMany({ where: { classroomId: classroom.id } });

    const finderEmpty = await getFinderRefreshData({ buildingId: "UB" });
    const chatEmpty = await answerLiveHelpIntent({
      kind: "room",
      buildingCode: "UB",
      roomNumber: "1205",
      floorNumber: 12,
    });
    const emptyOnFinder = !finderEmpty.rooms.some((r) => r.classroomId === classroom.id);
    assert(emptyOnFinder, "inventory only not on finder");
    assert(/not currently reported free/.test(chatEmpty), chatEmpty);

    const invalidChat = await answerLiveHelpIntent({
      kind: "room",
      buildingCode: "UB",
      roomNumber: "9999",
    });
    assert(/not currently reported free/.test(invalidChat), "invalid room");

    const reportDate = new Date(
      `${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })}T00:00:00.000Z`,
    );

    const otherReport = await prisma.freeReport.create({
      data: {
        classroomId: classroom.id,
        timeSlotId: otherSlot.id,
        reportDate,
        contributorToken: randomUUID(),
        status: "unverified",
        confirmationCount: 1,
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });

    const finderDefault = await getFinderRefreshData({ buildingId: "UB" });
    const chatDefault = await answerLiveHelpIntent({
      kind: "room",
      buildingCode: "UB",
      roomNumber: "1205",
    });
    const onDefaultFinder = finderDefault.rooms.some(
      (r) => r.freeReportId === otherReport.id,
    );
    if (currentSlotId && currentSlotId !== otherSlot.id) {
      assert(!onDefaultFinder, "other-slot report hidden on Finder default");
      assert(/not currently reported free/.test(chatDefault), chatDefault);
    } else {
      assert(onDefaultFinder, "no current slot → Finder lists all active");
      assert(/currently reported free/.test(chatDefault), chatDefault);
    }

    const finderAll = await getFinderRefreshData({
      buildingId: "UB",
      timeSlotId: "all",
    });
    const chatAll = await answerLiveHelpIntent({
      kind: "room",
      buildingCode: "UB",
      roomNumber: "1205",
      slotScope: "all",
    });
    assert(
      finderAll.rooms.some((r) => r.freeReportId === otherReport.id),
      "all-slots finder has other report",
    );
    assert(/currently reported free/.test(chatAll), chatAll);

    if (currentSlot) {
      await prisma.freeReport.delete({ where: { id: otherReport.id } });
      const currentReport = await prisma.freeReport.create({
        data: {
          classroomId: classroom.id,
          timeSlotId: currentSlot.id,
          reportDate,
          contributorToken: randomUUID(),
          status: "unverified",
          confirmationCount: 1,
          expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        },
      });
      const finderNow = await getFinderRefreshData({ buildingId: "UB" });
      const chatNow = await answerLiveHelpIntent({
        kind: "room",
        buildingCode: "UB",
        roomNumber: "1205",
      });
      assert(
        finderNow.rooms.some((r) => r.freeReportId === currentReport.id),
        "current-slot on finder",
      );
      assert(/currently reported free/.test(chatNow), chatNow);

      await prisma.freeReport.update({
        where: { id: currentReport.id },
        data: { status: "hidden" },
      });
      const finderHidden = await getFinderRefreshData({ buildingId: "UB" });
      const chatHidden = await answerLiveHelpIntent({
        kind: "room",
        buildingCode: "UB",
        roomNumber: "1205",
      });
      assert(
        !finderHidden.rooms.some((r) => r.freeReportId === currentReport.id),
        "hidden off finder",
      );
      assert(/not currently reported free/.test(chatHidden), chatHidden);

      await prisma.freeReport.update({
        where: { id: currentReport.id },
        data: { status: "expired" },
      });
      const finderExp = await getFinderRefreshData({ buildingId: "UB" });
      const chatExp = await answerLiveHelpIntent({
        kind: "room",
        buildingCode: "UB",
        roomNumber: "1205",
      });
      assert(
        !finderExp.rooms.some((r) => r.freeReportId === currentReport.id),
        "expired off finder",
      );
      assert(/not currently reported free/.test(chatExp), chatExp);
      await prisma.freeReport.delete({ where: { id: currentReport.id } });
    } else {
      await prisma.freeReport.update({
        where: { id: otherReport.id },
        data: { status: "hidden" },
      });
      const finderHidden = await getFinderRefreshData({ buildingId: "UB" });
      const chatHidden = await answerLiveHelpIntent({
        kind: "room",
        buildingCode: "UB",
        roomNumber: "1205",
      });
      assert(
        !finderHidden.rooms.some((r) => r.freeReportId === otherReport.id),
        "hidden off finder",
      );
      assert(/not currently reported free/.test(chatHidden), chatHidden);
      await prisma.freeReport.delete({ where: { id: otherReport.id } });
    }

    console.log(
      `ok  chat/finder agree (currentSlotId=${currentSlotId ?? "none"})`,
    );

    section("Env / secrets not public");
    const envExample = readFileSync(join(root, ".env.example"), "utf8");
    assert(envExample.includes("ADMIN_SECRET="), "admin in example");
    assert(!envExample.includes("NEXT_PUBLIC_ADMIN"), "not public admin");
    const login = readFileSync(
      join(root, "components/admin/admin-login-form.tsx"),
      "utf8",
    );
    assert(!login.includes("ADMIN_SECRET"), "login client");
    console.log("ok  secrets");
  } finally {
    await prisma.$disconnect();
  }

  console.log("\nV2.7 final QA tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
