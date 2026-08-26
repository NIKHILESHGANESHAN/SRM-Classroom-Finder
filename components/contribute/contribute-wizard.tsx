"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProgressIndicator } from "@/components/contribute/progress-indicator";
import { SlotPicker } from "@/components/contribute/slot-picker";
import { SuccessState } from "@/components/contribute/success-state";
import { GlassNavigation } from "@/components/glass";
import { MoreOptionsMenu } from "@/components/more-options-menu";
import { Button } from "@/components/ui/button";
import { submitFreeReport } from "@/lib/actions/contribute";
import type {
  BuildingOption,
  ContributePageData,
  TimeSlotOption,
} from "@/lib/contribute-data";
import { PRODUCT_NAME } from "@/lib/design-tokens";
import { MOTION_STANDARD, EASE_OUT_EXPO } from "@/lib/motion";
import { ensureDeviceToken } from "@/lib/token";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3;

type SuccessPayload = {
  kind: "created" | "confirmed" | "already_reported";
  roomLabel: string;
  slotLabel: string;
};

type ContributeWizardProps = {
  data: ContributePageData;
};

function humanSubmitError(error: string): string {
  if (error === "Couldn't submit your report.") {
    return "Something went wrong while reporting this room. Try again.";
  }
  if (error.includes("outside the reporting window")) {
    return "This period isn't open for reporting right now.";
  }
  if (error.includes("Daily contribution limit")) {
    return error;
  }
  if (error.includes("Too many requests")) {
    return error;
  }
  if (error.includes("Missing device token")) {
    return "Refresh the page and try again.";
  }
  return error;
}

function SelectionButton({
  selected,
  title,
  subtitle,
  onClick,
  className,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "btn-press flex min-h-11 w-full flex-col items-start justify-center rounded-control border px-4 py-3 text-left transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-cf-accent bg-cf-accent-muted ring-2 ring-cf-accent/20"
          : "border-border bg-card hover:border-cf-accent/35 hover:bg-muted/30",
        className,
      )}
    >
      <span className="text-base font-semibold text-foreground">{title}</span>
      {subtitle ? (
        <span className="text-sm text-muted-foreground">{subtitle}</span>
      ) : null}
    </button>
  );
}

export function ContributeWizard({ data }: ContributeWizardProps) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState(1);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [floorId, setFloorId] = useState<string | null>(null);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [timeSlotId, setTimeSlotId] = useState<string | null>(
    () => data.currentSlotId,
  );
  const [success, setSuccess] = useState<SuccessPayload | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const building: BuildingOption | undefined = useMemo(
    () => data.buildings.find((b) => b.id === buildingId),
    [data.buildings, buildingId],
  );

  const floors = building?.floors ?? [];
  const selectedFloor = floors.find((f) => f.id === floorId);
  const classrooms = selectedFloor?.classrooms ?? [];
  const selectedClassroom = classrooms.find((c) => c.id === classroomId);

  const selectedSlot: TimeSlotOption | undefined = useMemo(
    () => data.timeSlots.find((s) => s.id === timeSlotId),
    [data.timeSlots, timeSlotId],
  );

  const selectableSlots = data.timeSlots.filter((s) => s.selectable);
  const canSubmit =
    Boolean(buildingId && floorId && classroomId && timeSlotId) &&
    Boolean(selectedSlot?.selectable) &&
    !isPending;

  const summaryLine =
    building && selectedFloor && selectedClassroom
      ? `${building.code} · Floor ${selectedFloor.floorNumber} · Room ${selectedClassroom.roomNumber}`
      : null;

  const slotSummary = selectedSlot
    ? `Period ${selectedSlot.slotOrder} · ${selectedSlot.rangeLabel}`
    : null;

  function goTo(next: Step) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function selectBuilding(id: string) {
    setBuildingId(id);
    setFloorId(null);
    setClassroomId(null);
    setRoomError(null);
    setDirection(1);
    setStep(1);
  }

  function selectFloor(id: string) {
    setFloorId(id);
    setClassroomId(null);
    setRoomError(null);
    goTo(2);
  }

  function selectClassroom(id: string) {
    setClassroomId(id);
    setRoomError(null);
  }

  function continueFromRoom() {
    if (!classroomId || !selectedClassroom) {
      setRoomError("Pick a room from the list.");
      return;
    }
    if (classrooms.length === 0) {
      setRoomError("No rooms listed for this floor yet.");
      return;
    }
    setRoomError(null);
    if (
      !timeSlotId ||
      !data.timeSlots.find((s) => s.id === timeSlotId)?.selectable
    ) {
      setTimeSlotId(data.currentSlotId ?? selectableSlots[0]?.id ?? null);
    }
    goTo(3);
  }

  function resetWizard() {
    setSuccess(null);
    setStep(0);
    setDirection(1);
    setBuildingId(null);
    setFloorId(null);
    setClassroomId(null);
    setRoomError(null);
    setSubmitError(null);
    setTimeSlotId(data.currentSlotId);
  }

  function handleSubmit() {
    if (!buildingId || !floorId || !timeSlotId || !classroomId) return;
    if (!selectedClassroom) {
      setRoomError("Pick a room from the list.");
      goTo(2);
      return;
    }

    startTransition(async () => {
      setSubmitError(null);
      try {
        const deviceToken = ensureDeviceToken();
        const result = await submitFreeReport({
          buildingId,
          floorId,
          classroomId,
          timeSlotId,
          deviceToken,
        });

        if (!result.ok) {
          const message = humanSubmitError(result.error);
          setSubmitError(message);
          toast.error(message);
          return;
        }

        const roomLabel =
          `${building?.code ?? ""} ${selectedClassroom.roomNumber}`.trim();
        const slotLabel = selectedSlot
          ? `Period ${selectedSlot.slotOrder} · ${selectedSlot.rangeLabel}`
          : "Selected period";

        setSuccess({
          kind: result.kind,
          roomLabel,
          slotLabel,
        });
      } catch {
        const message = humanSubmitError("Couldn't submit your report.");
        setSubmitError(message);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 sm:max-w-lg sm:gap-5">
      <GlassNavigation
        aria-label="Contributor navigation"
        className="flex items-center gap-2 px-2 py-2 sm:px-3"
      >
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" asChild>
          <Link href="/" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
            {PRODUCT_NAME}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            Report a free room
          </p>
        </div>
        <MoreOptionsMenu className="shrink-0" />
      </GlassNavigation>

      <header className="px-1">
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
          Found an empty room?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Let other students know before someone else takes it.
        </p>
      </header>

      {success ? (
        <SuccessState
          kind={success.kind}
          roomLabel={success.roomLabel}
          slotLabel={success.slotLabel}
          onReportAnother={resetWizard}
        />
      ) : (
        <>
          <ProgressIndicator step={step} />

          <div
            className="relative min-h-[280px] overflow-hidden rounded-surface border border-border bg-card p-4 shadow-token-sm sm:min-h-[300px] sm:p-5"
            data-wizard-step={step}
          >
            <AnimatePresence initial={false} mode="sync">
              <motion.div
                key={step}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { x: direction > 0 ? 20 : -20, opacity: 0 }
                }
                animate={{ x: 0, opacity: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        x: direction > 0 ? -20 : 20,
                        opacity: 0,
                        position: "absolute",
                        width: "100%",
                      }
                }
                transition={
                  reduceMotion
                    ? { duration: 0.1 }
                    : { duration: MOTION_STANDARD, ease: EASE_OUT_EXPO }
                }
                className="w-full space-y-4"
              >
                {step === 0 && (
                  <section className="space-y-4" aria-label="Select building">
                    <div>
                      <h3 className="text-lg font-semibold">Which building?</h3>
                      <p className="text-sm text-muted-foreground">
                        UB · TP1 · TP2
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {data.buildings.map((b) => (
                        <SelectionButton
                          key={b.id}
                          selected={buildingId === b.id}
                          title={b.code}
                          subtitle={b.name}
                          onClick={() => selectBuilding(b.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {step === 1 && (
                  <section className="space-y-4" aria-label="Select floor">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Which floor?</h3>
                        <p className="text-sm text-muted-foreground">
                          {building
                            ? `${building.code} · ${building.name}`
                            : "Pick a floor"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 shrink-0"
                        onClick={() => goTo(0)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {floors.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          aria-pressed={floorId === f.id}
                          onClick={() => selectFloor(f.id)}
                          className={cn(
                            "btn-press flex min-h-11 items-center justify-center rounded-control border text-base font-semibold tabular-nums transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            floorId === f.id
                              ? "border-cf-accent bg-cf-accent-muted text-foreground ring-2 ring-cf-accent/20"
                              : "border-border bg-card hover:border-cf-accent/35",
                          )}
                        >
                          {f.floorNumber}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {step === 2 && (
                  <section className="space-y-4" aria-label="Select classroom">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Which room?</h3>
                        <p className="text-sm text-muted-foreground">
                          {building?.code} · Floor {selectedFloor?.floorNumber}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 shrink-0"
                        onClick={() => goTo(1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </Button>
                    </div>
                    {classrooms.length === 0 ? (
                      <div
                        role="status"
                        className="rounded-surface border border-dashed border-border bg-muted/30 px-4 py-8 text-left"
                      >
                        <p className="font-medium text-foreground">
                          No rooms listed for this floor yet
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          We don&apos;t have a verified list for {building?.code}{" "}
                          Floor {selectedFloor?.floorNumber} — that doesn&apos;t
                          mean every room is occupied.
                        </p>
                      </div>
                    ) : (
                      <div
                        className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                        role="listbox"
                        aria-label="Classrooms on this floor"
                      >
                        {classrooms.map((room) => (
                          <button
                            key={room.id}
                            type="button"
                            role="option"
                            aria-selected={classroomId === room.id}
                            onClick={() => selectClassroom(room.id)}
                            className={cn(
                              "btn-press flex min-h-11 items-center justify-center rounded-control border text-base font-semibold tabular-nums transition-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              classroomId === room.id
                                ? "border-cf-accent bg-cf-accent-muted text-foreground ring-2 ring-cf-accent/20"
                                : "border-border bg-card hover:border-cf-accent/35",
                            )}
                          >
                            {room.roomNumber}
                          </button>
                        ))}
                      </div>
                    )}
                    {roomError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {roomError}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      className="min-h-11 w-full"
                      disabled={classrooms.length === 0}
                      onClick={continueFromRoom}
                    >
                      Continue
                    </Button>
                  </section>
                )}

                {step === 3 && (
                  <section className="space-y-4" aria-label="Confirm report">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Confirm</h3>
                        <p className="text-sm text-muted-foreground">
                          Check the room and period, then report it.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 shrink-0"
                        onClick={() => goTo(2)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </Button>
                    </div>

                    {summaryLine && slotSummary ? (
                      <div className="rounded-surface border border-border bg-muted/30 px-4 py-3 text-left">
                        <p className="type-room text-2xl text-foreground">
                          {selectedClassroom?.roomNumber}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {summaryLine}
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {slotSummary}
                        </p>
                      </div>
                    ) : null}

                    {selectableSlots.length === 0 ? (
                      <div
                        role="status"
                        className="rounded-surface border border-dashed border-border bg-muted/30 px-4 py-6 text-left"
                      >
                        <p className="font-medium text-foreground">
                          No reportable period right now
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Come back during a class period (±5 min grace).
                        </p>
                      </div>
                    ) : (
                      <SlotPicker
                        slots={data.timeSlots}
                        value={timeSlotId}
                        onChange={setTimeSlotId}
                      />
                    )}

                    {submitError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {submitError}
                      </p>
                    ) : null}

                    <Button
                      type="button"
                      className="min-h-11 w-full text-base"
                      disabled={!canSubmit || selectableSlots.length === 0}
                      onClick={handleSubmit}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Reporting…
                        </>
                      ) : submitError ? (
                        "Try again"
                      ) : (
                        "Report this room"
                      )}
                    </Button>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
