"use client";

import { logoutAdmin } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  return (
    <form action={logoutAdmin}>
      <Button type="submit" variant="outline" className="min-h-11">
        Log out
      </Button>
    </form>
  );
}
