"use client";

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  RefreshCw,
  SendHorizonal,
  Wand2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { RevealText } from "@/components/studio/reveal-text";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CardState } from "@/hooks/use-studio";
import { REFINE_OPTIONS, STYLE_BY_KEY, X_CHAR_LIMIT } from "@/lib/catalog";
import type { Platform, RefineAction } from "@/lib/types";
import { cn } from "@/lib/utils";

const cardMotion = {
  initial: { opacity: 0, y: 24, scale: 0.97, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.96, filter: "blur(6px)" },
  transition: { type: "spring" as const, stiffness: 260, damping: 26 },
};

function Shell({
  styleKey,
  children,
  className,
  index,
}: {
  styleKey: string;
  children: React.ReactNode;
  className?: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = STYLE_BY_KEY[styleKey];
  return (
    <motion.article
      ref={ref}
      layout
      {...cardMotion}
      transition={{ ...cardMotion.transition, delay: index * 0.04 }}
      onPointerMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        ref.current!.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        ref.current!.style.setProperty("--my", `${e.clientY - rect.top}px`);
      }}
      className={cn(
        "group/card relative overflow-hidden rounded-2xl border bg-card/80 p-4 shadow-[0_10px_40px_-20px_rgb(0_0_0/0.5)] backdrop-blur-xl",
        className,
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", meta?.accent.bar)} />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        style={{
          background: "radial-gradient(400px circle at var(--mx) var(--my), var(--glow-1), transparent 45%)",
        }}
      />
      <div className="relative">{children}</div>
    </motion.article>
  );
}

function StyleHeader({ styleKey, right }: { styleKey: string; right?: React.ReactNode }) {
  const meta = STYLE_BY_KEY[styleKey];
  const Icon = meta?.icon ?? Info;
  return (
    <header className="mb-3 flex items-center gap-2">
      <span className={cn("flex size-7 items-center justify-center rounded-lg", meta?.accent.bg, meta?.accent.text)}>
        <Icon className="size-3.5" />
      </span>
      <span className="text-sm font-medium">{meta?.name ?? styleKey}</span>
      <div className="ml-auto flex items-center gap-1">{right}</div>
    </header>
  );
}

export function PendingCard({ styleKey, index }: { styleKey: string; index: number }) {
  return (
    <Shell styleKey={styleKey} index={index}>
      <StyleHeader
        styleKey={styleKey}
        right={
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Writing
            <span className="inline-flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-1 rounded-full bg-current"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </span>
          </span>
        }
      />
      <div className="space-y-2.5">
        {["w-full", "w-[92%]", "w-[70%]"].map((w) => (
          <div
            key={w}
            className={cn(
              "h-3 animate-shimmer rounded-full bg-[linear-gradient(90deg,var(--muted)_0%,var(--accent)_50%,var(--muted)_100%)] bg-[length:200%_100%]",
              w,
            )}
          />
        ))}
      </div>
    </Shell>
  );
}

export function FailedCard({
  styleKey,
  message,
  index,
  onRetry,
}: {
  styleKey: string;
  message: string;
  index: number;
  onRetry?: () => void;
}) {
  return (
    <Shell styleKey={styleKey} index={index}>
      <StyleHeader styleKey={styleKey} />
      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p className="line-clamp-3 flex-1">{message === "Stopped" ? "Generation was stopped." : message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </Shell>
  );
}

function CharMeter({ count, platform }: { count: number; platform: Platform }) {
  if (platform !== "x") {
    return <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{count} chars</span>;
  }
  const ratio = Math.min(count / X_CHAR_LIMIT, 1);
  const over = count > X_CHAR_LIMIT;
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
      <svg viewBox="0 0 18 18" className="size-4 -rotate-90">
        <circle cx="9" cy="9" r={r} className="fill-none stroke-muted" strokeWidth="2.2" />
        <motion.circle
          cx="9"
          cy="9"
          r={r}
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={over ? "stroke-destructive" : ratio > 0.9 ? "stroke-amber-400" : "stroke-primary"}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      {count}/{X_CHAR_LIMIT}
    </span>
  );
}

interface ReadyProps {
  card: Extract<CardState, { status: "ready" }>;
  index: number;
  platform: Platform;
  onRegenerate: () => void;
  onRefine: (action: RefineAction, instruction?: string) => void;
  onSelectVersion: (index: number) => void;
}

export function CommentCard({ card, index, platform, onRegenerate, onRefine, onSelectVersion }: ReadyProps) {
  const comment = card.versions[card.index];
  const [copied, setCopied] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const busy = card.busy !== null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(comment.text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't access the clipboard.");
    }
  };

  const submitCustom = () => {
    if (!instruction.trim()) return;
    onRefine("custom", instruction.trim());
    setInstruction("");
    setCustomOpen(false);
  };

  return (
    <Shell styleKey={card.style} index={index}>
      <StyleHeader
        styleKey={card.style}
        right={
          card.versions.length > 1 && (
            <div className="inline-flex items-center rounded-md bg-muted/70 text-[11px] text-muted-foreground">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Previous version"
                disabled={card.index === 0 || busy}
                onClick={() => onSelectVersion(card.index - 1)}
              >
                <ChevronLeft />
              </Button>
              <span className="px-0.5 font-mono tabular-nums">
                {card.index + 1}/{card.versions.length}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Next version"
                disabled={card.index === card.versions.length - 1 || busy}
                onClick={() => onSelectVersion(card.index + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )
        }
      />

      <div className="relative min-h-12 text-[15px] leading-relaxed">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={comment.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: busy ? 0.35 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <RevealText text={comment.text} />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {busy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full border bg-popover/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur">
                <Wand2 className="size-3.5 animate-pulse text-primary" />
                {card.busy === "refine" ? "Refining…" : "Rewriting…"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {showWhy && (
          <motion.p
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
          >
            <span className="font-medium text-foreground">Why it works: </span>
            {comment.rationale}
          </motion.p>
        )}
        {customOpen && (
          <motion.form
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="flex gap-2 overflow-hidden p-0.5"
            onSubmit={(e) => {
              e.preventDefault();
              submitCustom();
            }}
          >
            <Input
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. mention our team tried this last quarter"
              maxLength={300}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Escape" && setCustomOpen(false)}
            />
            <Button type="submit" size="icon" aria-label="Apply instruction" disabled={!instruction.trim()}>
              <SendHorizonal />
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <footer className="mt-4 flex items-center gap-1 border-t pt-3">
        <CharMeter count={comment.char_count} platform={platform} />
        <Button
          variant="ghost"
          size="xs"
          className={cn("ml-1 text-muted-foreground", showWhy && "text-foreground")}
          onClick={() => setShowWhy((v) => !v)}
          aria-expanded={showWhy}
        >
          <Info /> Why
        </Button>
        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Regenerate" disabled={busy} onClick={onRegenerate} />
              }
            >
              <RefreshCw className={cn(card.busy === "regenerate" && "animate-spin")} />
            </TooltipTrigger>
            <TooltipContent>Regenerate</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" disabled={busy} aria-label="Refine comment" />}
            >
              <Wand2 /> Refine
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {REFINE_OPTIONS.map((option) => (
                <DropdownMenuItem key={option.action} onClick={() => onRefine(option.action)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCustomOpen(true)}>Custom instruction…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={copy} className="relative ml-1 min-w-[76px] overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={copied ? "copied" : "copy"}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="inline-flex items-center gap-1"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </footer>
    </Shell>
  );
}
