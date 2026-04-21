import { useState } from "react";
import { z } from "zod";

const Schema = z.object({ email: z.string().email() });

interface EmailSignupFormProps {
  placeholder: string;
  submit: string;
  errorMessage: string;
  successMessage: string;
}

export default function EmailSignupForm({
  placeholder,
  submit,
  errorMessage,
  successMessage,
}: EmailSignupFormProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = Schema.safeParse({ email });
    if (result.success) {
      setState("ok");
      // F1: no backend. Log and thank the user.
      console.log("[jinba-web] email signup:", email);
    } else {
      setState("error");
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2" noValidate>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="email-signup">
          Email
        </label>
        <input
          id="email-signup"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          placeholder={placeholder}
          aria-invalid={state === "error"}
          aria-describedby={state === "error" ? "email-error" : undefined}
          className="flex-1 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] aria-[invalid=true]:border-[var(--color-accent-hot)] transition-colors"
        />
        <button
          type="submit"
          className="rounded-[var(--radius)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hot)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] transition-colors"
        >
          {submit}
        </button>
      </div>
      {state === "error" && (
        <p id="email-error" role="alert" className="text-xs text-[var(--color-accent-hot)]">
          {errorMessage}
        </p>
      )}
      {state === "ok" && (
        <output className="text-xs text-[var(--color-muted)]">{successMessage}</output>
      )}
    </form>
  );
}

import type React from "react";
