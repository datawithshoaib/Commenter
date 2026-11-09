"use client";

import { Sparkles, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

export function GenerateButton({
  streaming,
  disabled,
  progress,
  onGenerate,
  onStop,
}: {
  streaming: boolean;
  disabled: boolean;
  progress: { done: number; total: number };
  onGenerate: () => void;
  onStop: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={streaming ? onStop : onGenerate}
      disabled={!streaming && disabled}
      whileHover={!disabled || streaming ? { scale: 1.01 } : undefined}
      whileTap={!disabled || streaming ? { scale: 0.98 } : undefined}
      className={cn(
        "group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl font-medium text-white shadow-[0_12px_40px_-12px_var(--glow-1)] outline-none focus-visible:ring-3 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
      )}
    >
      <span className="absolute inset-0 animate-gradient bg-[linear-gradient(110deg,oklch(0.55_0.24_285),oklch(0.62_0.24_330),oklch(0.62_0.17_230),oklch(0.55_0.24_285))] bg-[length:300%_100%]" />
      {/* sheen sweep on hover */}
      <span className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/25 blur-md transition-transform duration-700 group-hover:translate-x-[300%]" />
      {streaming && (
        <motion.span
          className="absolute inset-y-0 left-0 bg-white/15"
          initial={{ width: "0%" }}
          animate={{ width: `${progress.total ? ((progress.done + 0.5) / (progress.total + 1)) * 100 : 10}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={streaming ? "stop" : "go"}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative inline-flex items-center gap-2"
        >
          {streaming ? (
            <>
              <Square className="size-3.5 fill-current" />
              Writing {Math.min(progress.done + 1, progress.total)}/{progress.total} · Stop
            </>
          ) : (
            <>
              <Sparkles className="size-4 transition-transform duration-500 group-hover:rotate-12" />
              Generate comments
              <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] sm:inline">Ctrl ↵</kbd>
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
