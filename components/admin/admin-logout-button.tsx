"use client";

import { logoutAdmin } from "@/lib/actions/admin";
import { useSound } from "@/components/sound/sound-provider";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  const { play } = useSound();

  return (
    <form action={logoutAdmin}>
      <Button
        type="submit"
        variant="outline"
        className="btn-press min-h-11"
        onClick={() => play("click")}
      >
        Log out
      </Button>
    </form>
  );
}
