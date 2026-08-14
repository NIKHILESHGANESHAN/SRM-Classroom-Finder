import { getAdminHealth } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  requireAdmin();
  const health = await getAdminHealth();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System health</CardTitle>
          <CardDescription>No secrets or connection strings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Database: {health.databaseOk ? "connected" : "unavailable"}</p>
          <p>App version: {health.appVersion}</p>
          <p>Server time (UTC): {health.serverTimeIso}</p>
          <p>Campus time (IST): {health.campusTimeLabel}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Counts</CardTitle>
          <CardDescription>From PostgreSQL aggregates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm tabular-nums">
          <p>Active classrooms: {health.activeClassroomCount}</p>
          <p>Active free reports: {health.activeFreeReportCount}</p>
          <p>Expired reports: {health.expiredReportCount}</p>
          <p>Hidden reports: {health.hiddenReportCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
