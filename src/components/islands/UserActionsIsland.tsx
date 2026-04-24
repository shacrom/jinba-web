import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
/**
 * src/components/islands/UserActionsIsland.tsx — F2 Batch 5
 *
 * Client-side island for the model detail page user action strip.
 * Uses the browser Supabase client to determine auth + garage/watchlist state.
 * Renders: sign-in prompt | garage button | watchlist button.
 */
import { useEffect, useState } from "react";

interface Props {
  generationId: number;
  locale: "es" | "en";
  labels: {
    signInPrompt: string;
    addGarage: string;
    inGarage: string;
    watch: string;
    watching: string;
  };
}

type State =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "user"; inGarage: boolean; inWatchlist: boolean };

export default function UserActionsIsland({ generationId, locale, labels }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let sb: ReturnType<typeof getSupabaseBrowserClient> | null = null;
      try {
        sb = getSupabaseBrowserClient();
      } catch {
        if (!cancelled) setState({ kind: "anon" });
        return;
      }

      const {
        data: { user },
      } = await sb.auth.getUser();

      if (!user) {
        if (!cancelled) setState({ kind: "anon" });
        return;
      }

      const [garageRes, watchRes] = await Promise.all([
        sb
          .from("user_cars")
          .select("id")
          .eq("user_id", user.id)
          .eq("generation_id", generationId)
          .limit(1),
        sb
          .from("user_watchlist")
          .select("id")
          .eq("user_id", user.id)
          .eq("generation_id", generationId)
          .limit(1),
      ]);

      if (!cancelled) {
        setState({
          kind: "user",
          inGarage: (garageRes.data?.length ?? 0) > 0,
          inWatchlist: (watchRes.data?.length ?? 0) > 0,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [generationId]);

  const btnBase =
    "inline-block rounded-[var(--radius)] px-4 py-2 text-sm font-medium transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";
  const btnPrimary = `${btnBase} bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:opacity-90`;
  const btnSecondary = `${btnBase} border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]`;

  if (state.kind === "loading") {
    // Render nothing during hydration to avoid layout shift
    return null;
  }

  if (state.kind === "anon") {
    const loginUrl = `/${locale}/auth/login?from=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`;
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <a href={loginUrl} className={btnPrimary}>
          {labels.signInPrompt}
        </a>
      </div>
    );
  }

  const { inGarage, inWatchlist } = state;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
      {inGarage ? (
        <a href={`/${locale}/account/garage`} className={btnSecondary}>
          {labels.inGarage}
        </a>
      ) : (
        <a href={`/${locale}/account/garage/add?gen_id=${generationId}`} className={btnPrimary}>
          {labels.addGarage}
        </a>
      )}

      {inWatchlist ? (
        <a href={`/${locale}/account/watchlist`} className={btnSecondary}>
          {labels.watching}
        </a>
      ) : (
        <form
          method="POST"
          action={`/${locale}/account/watchlist/quick-add`}
          style={{ display: "inline" }}
        >
          <input type="hidden" name="gen_id" value={generationId} />
          <button type="submit" className={btnPrimary}>
            {labels.watch}
          </button>
        </form>
      )}
    </div>
  );
}
