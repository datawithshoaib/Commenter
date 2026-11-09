"use client";

import { ExternalLink, Target } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { PlatformIcon } from "@/components/brand";
import { PLATFORM_LABEL } from "@/lib/catalog";
import type { Post, PostAnalysis, Sentiment } from "@/lib/types";
import { cn } from "@/lib/utils";

const SENTIMENT: Record<Sentiment, { label: string; className: string }> = {
  positive: { label: "Positive", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  neutral: { label: "Neutral", className: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  negative: { label: "Negative", className: "bg-red-500/15 text-red-600 dark:text-red-300" },
  mixed: { label: "Mixed", className: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
};

export function AnalysisPanel({ post, analysis }: { post: Post | null; analysis: PostAnalysis | null }) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="relative overflow-hidden rounded-2xl border bg-card/70 p-4 backdrop-blur-xl"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {post ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5">
              <PlatformIcon platform={post.platform} className="size-3" />
              {PLATFORM_LABEL[post.platform]}
            </span>
            {post.author && <span className="font-medium text-foreground">{post.author}</span>}
            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                Open post <ExternalLink className="size-3" />
              </a>
            )}
          </>
        ) : (
          <span className="h-4 w-40 animate-pulse rounded bg-muted" />
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {analysis ? (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.4 }}
            className="mt-3 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-xl leading-tight tracking-tight">{analysis.topic}</h3>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", SENTIMENT[analysis.sentiment].className)}>
                {SENTIMENT[analysis.sentiment].label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Target className="size-3.5 text-primary" />
              <span>
                Author intent: <span className="text-foreground">{analysis.author_intent}</span>
              </span>
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {analysis.key_points.map((point, i) => (
                <motion.li
                  key={point}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="rounded-lg border bg-background/50 px-2 py-1 text-xs"
                >
                  {point}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : (
          <motion.div key="loading" exit={{ opacity: 0 }} className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{post ? "Reading the post…" : "Fetching the post…"}</p>
            <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
