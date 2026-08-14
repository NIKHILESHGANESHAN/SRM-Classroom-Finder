"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isOfficialInventoryRoom } from "@/prisma/data/classroom-inventory";
import {
  clearAdminSessionCookie,
  isAdminAuthenticated,
  secretsMatch,
  writeAdminSessionCookie,
} from "@/lib/admin/session";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getClientIp, RATE_LIMITS, rateLimit } from "@/lib/rate-limit";

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginAdmin(formData: FormData): Promise<AdminActionResult> {
  const ip = getClientIp({ headers: headers() });
  const rl = rateLimit(
    `admin-login:${ip}`,
    RATE_LIMITS.adminLogin.limit,
    RATE_LIMITS.adminLogin.windowMs,
  );
  if (!rl.success) {
    logger.warn("admin.login_rate_limited", { ip });
    return { ok: false, error: "Too many attempts. Try again later." };
  }

  const provided = String(formData.get("secret") ?? "");
  if (!secretsMatch(provided, env.ADMIN_SECRET)) {
    logger.warn("admin.login_failed", { ip });
    return { ok: false, error: "Invalid admin secret." };
  }

  writeAdminSessionCookie();
  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  clearAdminSessionCookie();
  redirect("/admin/login");
}

export async function setClassroomActive(input: {
  classroomId: string;
  isActive: boolean;
}): Promise<AdminActionResult> {
  if (!isAdminAuthenticated()) {
    return { ok: false, error: "Unauthorized." };
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id: input.classroomId },
    include: {
      building: { select: { code: true } },
      floor: { select: { floorNumber: true } },
    },
  });
  if (!classroom) return { ok: false, error: "Classroom not found." };

  if (input.isActive) {
    const allowed = isOfficialInventoryRoom(
      classroom.building.code,
      classroom.floor.floorNumber,
      classroom.roomNumber,
    );
    if (!allowed) {
      return {
        ok: false,
        error:
          "That classroom is not in the official inventory and cannot be activated.",
      };
    }
  }

  await prisma.classroom.update({
    where: { id: classroom.id },
    data: { isActive: input.isActive },
  });

  return { ok: true };
}
