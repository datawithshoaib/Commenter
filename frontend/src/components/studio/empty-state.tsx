"use client";

import { motion } from "motion/react";

import { STYLE_BY_KEY } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const SAMPLES = [
  { style: "curious", text: "Which meeting did the team miss least? I'd bet it wasn't the status sync." },
  { style: "insightful", text: "Cutting meetings works because it forces decisions into writing, and writing scales." },
  { style: "witty", text: "30 days without standups and nobody fell over. Turns out we could stand on our own." },
];

export function EmptyState() {
  return (
    <div className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card/30 p-8 text-center backdrop-blur-sm">
      <div className="relative mb-8 h-44 w-full max-w-sm">
        {SAMPLES.map((sample, i) => {
          const meta = STYLE_BY_KEY[sample.style];
          const Icon = meta.icon;
          return (
            <motion.div
              key={sample.style}
              initial={{ opacity: 0, y: 30, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: [-4, 3, -2][i] }}
              transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 140, damping: 16 }}
              className={cn(
                "absolute w-[85%] rounded-xl border bg-card/90 p-3 text-left text-xs shadow-xl backdrop-blur",
                ["top-0 left-0", "top-12 right-0", "top-24 left-[6%]"][i],
              )}
            >
              <div className="animate-float" style={{ animationDelay: `${i * -2.3}s` }}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className={cn("flex size-5 items-center justify-center rounded-md", meta.accent.bg, meta.accent.text)}>
                    <Icon className="size-3" />
                  </span>
                  <span className="font-medium">{meta.name}</span>
                </div>
                <p className="text-muted-foreground">{sample.text}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <h3 className="font-heading text-2xl tracking-tight">Your comments will appear here</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Paste a post or drop a LinkedIn / X link, pick a few styles, and hit generate. Each style writes a different
        kind of reply.
      </p>
    </div>
  );
}
