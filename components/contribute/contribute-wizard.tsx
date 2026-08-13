"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProgressIndicator } from "@/components/contribute/progress-indicator";
import { SlotPicker } from "@/components/contribute/slot-picker";
import { SuccessState } from "@/components/contribute/success-state";
import { Button } from "@/components/ui/button";
import { submitFreeReport } from "@/lib/actions/contribute";
import type {
  BuildingOption,
  ContributePageData,
  TimeSlotOption,
} from "@/lib/contribute-data";
import { DURATION_WIZARD, EASE_OUT_EXPO } from "@/lib/motion";
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

function ChoiceCard({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50",
      )}
    >
      <span className="text-base font-semibold">{title}</span>
      {subtitle ? (
        <span
          className={cn(
            "text-sm",
            selected ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </span>
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
      setRoomError("Select a classroom from the list.");
      return;
    }
    if (classrooms.length === 0) {
      setRoomError("No classrooms are listed for this floor yet.");
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
    setTimeSlotId(data.currentSlotId);
  }

  function handleSubmit() {
    if (!buildingId || !floorId || !timeSlotId || !classroomId) return;
    if (!selectedClassroom) {
      setRoomError("Select a classroom from the list.");
      goTo(2);
      return;
    }

    startTransition(async () => {
      const deviceToken = ensureDeviceToken();
      const result = await submitFreeReport({
        buildingId,
        floorId,
        classroomId,
        timeSlotId,
        deviceToken,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const roomLabel =
        `${building?.code ?? ""} ${selectedClassroom.roomNumber}`.trim();
      const slotLabel = selectedSlot
        ? `Slot ${selectedSlot.slotOrder} · ${selectedSlot.rangeLabel}`
        : "Selected slot";

      toast.success(
        result.kind === "confirmed"
          ? "Confirmation recorded"
          : result.kind === "already_reported"
            ? "Already on the board"
            : "Free room reported",
      );

      setSuccess({
        kind: result.kind,
        roomLabel,
        slotLabel,
      });
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" asChild>
          <Link href="/" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Contributor
          </h1>
          <p className="text-sm text-muted-foreground">
            Report a free classroom — no login needed.
          </p>
        </div>
      </div>

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
            className="relative min-h-[320px] overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-6"
            data-wizard-step={step}
          >
            <AnimatePresence initial={false} mode="sync">
              <motion.div
                key={step}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { x: direction > 0 ? 28 : -28, opacity: 0 }
                }
                animate={{ x: 0, opacity: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { x: direction > 0 ? -28 : 28, opacity: 0, position: "absolute", width: "100%" }
                }
                transition={
                  reduceMotion
                    ? { duration: 0.1 }
                    : { duration: DURATION_WIZARD, ease: EASE_OUT_EXPO }
                }
                className="w-full space-y-5"
              >
                {step === 0 && (
                  <section className="space-y-4" aria-label="Select building">
                    <div>
                      <h2 className="text-lg font-semibold">Which building?</h2>
                      <p className="text-sm text-muted-foreground">
                        UB, Tech Park 1, or Tech Park 2.
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {data.buildings.map((b) => (
                        <ChoiceCard
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
                        <h2 className="text-lg font-semibold">Which floor?</h2>
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
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {floors.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => selectFloor(f.id)}
                          className={cn(
                            "flex min-h-11 items-center justify-center rounded-xl border text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            floorId === f.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:border-primary/40",
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
                        <h2 className="text-lg font-semibold">Which classroom?</h2>
                        <p className="text-sm text-muted-foreground">
                          {building?.code} · Floor{" "}
                          {selectedFloor?.floorNumber}
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
                        className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center"
                      >
                        <p className="font-medium text-foreground">
                          No classrooms listed for this floor yet
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          We don&apos;t have a verified room list for{" "}
                          {building?.code} Floor {selectedFloor?.floorNumber}.
                          That does not mean every room is occupied.
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
                              "flex min-h-11 items-center justify-center rounded-xl border text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              classroomId === room.id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary/40",
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
                    ) : classrooms.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Choose a room from the verified inventory for this floor.
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
                  <section className="space-y-4" aria-label="Select time slot">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">Time slot</h2>
                        <p className="text-sm text-muted-foreground">
                          {building?.code} · Floor{" "}
                          {selectedFloor?.floorNumber} ·{" "}
                          {selectedClassroom?.roomNumber ?? "Room"}
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

                    {selectableSlots.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
                        <p className="font-medium text-foreground">
                          No reportable slot right now
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

                    <Button
                      type="button"
                      className="min-h-11 w-full"
                      disabled={!canSubmit || selectableSlots.length === 0}
                      onClick={handleSubmit}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        "Submit free room"
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
