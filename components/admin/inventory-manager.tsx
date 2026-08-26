"use client";

import { useMemo, useState } from "react";
import { ClassroomActiveToggle } from "@/components/admin/classroom-active-toggle";
import { ClassroomAddForm } from "@/components/admin/classroom-add-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminBuildingSummary, AdminInventoryRow } from "@/lib/admin/data";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";

type Props = {
  rows: AdminInventoryRow[];
  buildings: AdminBuildingSummary[];
};

function InventoryStatus({
  isActive,
  official,
}: {
  isActive: boolean;
  official: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex rounded-control border px-2 py-0.5 text-xs font-medium",
          isActive
            ? "border-cf-accent/30 bg-cf-accent-muted text-foreground"
            : "border-border bg-muted/40 text-muted-foreground",
        )}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
      {!official ? (
        <span className="text-xs text-muted-foreground">Not in official list</span>
      ) : null}
    </span>
  );
}

export function InventoryManager({ rows, buildings }: Props) {
  const [query, setQuery] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (buildingFilter !== "all" && row.buildingCode !== buildingFilter) {
        return false;
      }
      if (statusFilter === "active" && !row.isActive) return false;
      if (statusFilter === "inactive" && row.isActive) return false;
      if (!q) return true;
      const haystack =
        `${row.buildingCode} ${row.floorNumber} ${row.roomNumber}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, buildingFilter, statusFilter]);

  const tp1 = buildings.find((b) => b.code === "TP1");

  return (
    <div className="space-y-6">
      {tp1 ? (
        <p
          role="status"
          className="rounded-surface border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
        >
          <span className="font-medium text-foreground">TP1</span> — inventory
          not yet added. No classrooms are listed for Tech Park 1.
        </p>
      ) : null}

      <ClassroomAddForm existingRows={rows} />

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="inventory-search">Search</Label>
            <Input
              id="inventory-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Room, building, or floor"
              className="min-h-11"
              autoComplete="off"
            />
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inventory-building">Building</Label>
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger id="inventory-building" className="min-h-11 w-full sm:w-[9rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {buildings.map((building) => (
                    <SelectItem key={building.buildingId} value={building.code}>
                      {building.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventory-status">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger id="inventory-status" className="min-h-11 w-full sm:w-[9rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {filtered.length} classroom{filtered.length === 1 ? "" : "s"}
          {query ? ` matching “${query.trim()}”` : ""}
        </p>

        {filtered.length === 0 ? (
          <p className="rounded-surface border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No classrooms match these filters.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-surface border border-border bg-card shadow-token-sm md:block">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <caption className="sr-only">Classroom inventory</caption>
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Room
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Building
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Floor
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.classroomId} className="border-t border-border/70">
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {row.roomNumber}
                      </td>
                      <td className="px-4 py-3">{row.buildingCode}</td>
                      <td className="px-4 py-3 tabular-nums">{row.floorNumber}</td>
                      <td className="px-4 py-3">
                        <InventoryStatus
                          isActive={row.isActive}
                          official={row.official}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ClassroomActiveToggle
                          classroomId={row.classroomId}
                          buildingCode={row.buildingCode}
                          floorNumber={row.floorNumber}
                          roomNumber={row.roomNumber}
                          isActive={row.isActive}
                          canActivate={row.official}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {filtered.map((row) => (
                <li
                  key={row.classroomId}
                  className="rounded-surface border border-border bg-card p-4 shadow-token-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold tabular-nums text-foreground">
                        {row.buildingCode} {row.roomNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Floor {row.floorNumber}
                      </p>
                    </div>
                    <InventoryStatus
                      isActive={row.isActive}
                      official={row.official}
                    />
                  </div>
                  <div className="mt-3">
                    <ClassroomActiveToggle
                      classroomId={row.classroomId}
                      buildingCode={row.buildingCode}
                      floorNumber={row.floorNumber}
                      roomNumber={row.roomNumber}
                      isActive={row.isActive}
                      canActivate={row.official}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
