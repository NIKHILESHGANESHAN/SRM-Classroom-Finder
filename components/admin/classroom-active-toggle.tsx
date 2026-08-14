"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setClassroomActive } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

type Props = {
  classroomId: string;
  isActive: boolean;
  canActivate: boolean;
};

export function ClassroomActiveToggle({
  classroomId,
  isActive,
  canActivate,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant={isActive ? "outline" : "default"}
      className="min-h-11"
      disabled={pending || (!isActive && !canActivate)}
      onClick={() => {
        start(async () => {
          const result = await setClassroomActive({
            classroomId,
            isActive: !isActive,
          });
          if (result.ok) router.refresh();
        });
      }}
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
