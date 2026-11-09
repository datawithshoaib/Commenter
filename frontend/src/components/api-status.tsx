"use client";

import { useEffect, useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, API_URL } from "@/lib/api";
import type { Health } from "@/lib/types";
import { cn } from "@/lib/utils";

type State = { kind: "checking" } | { kind: "offline" } | { kind: "ok"; health: Health };

export function ApiStatus() {
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const health = await api.health(controller.signal);
        setState({ kind: "ok", health });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({ kind: "offline" });
      }
      timer = setTimeout(check, 30_000);
    };
    check();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const ready = state.kind === "ok" && state.health.llm_configured;
  const label =
    state.kind === "checking"
      ? "Connecting"
      : state.kind === "offline"
        ? "API offline"
        : ready
          ? state.health.model
          : "Groq key missing";
  const detail =
    state.kind === "offline"
      ? `No response from ${API_URL}. Start the backend with: uv run uvicorn app.main:app --reload`
      : state.kind === "ok" && !ready
        ? "Set GROQ_API_KEY in backend/.env and restart the API."
        : state.kind === "ok"
          ? "Connected to Groq via LangChain"
          : "Checking the API…";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="hidden items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur sm:inline-flex" />
        }
      >
        <span className="relative flex size-2">
          {ready && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              state.kind === "checking" && "bg-muted-foreground",
              state.kind === "offline" && "bg-red-500",
              state.kind === "ok" && (ready ? "bg-emerald-400" : "bg-amber-400"),
            )}
          />
        </span>
        <span className="max-w-40 truncate font-mono">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  );
}
