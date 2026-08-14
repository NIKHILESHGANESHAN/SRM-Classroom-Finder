"use client";

import { useState } from "react";
import { loginAdmin } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setPending(true);
        setError(null);
        void loginAdmin(data)
          .then((result) => {
            if (result && !result.ok) setError(result.error);
            setPending(false);
          })
          .catch(() => {
            setPending(false);
          });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="admin-secret">Admin secret</Label>
        <Input
          id="admin-secret"
          name="secret"
          type="password"
          autoComplete="current-password"
          className="min-h-11"
          required
          minLength={16}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="min-h-11 w-full" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </Button>
    </form>
  );
}
