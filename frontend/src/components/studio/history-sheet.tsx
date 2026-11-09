"use client";

import { History, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { PlatformIcon } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { HistoryEntry } from "@/hooks/use-history";

function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HistorySheet({
  entries,
  onRestore,
  onRemove,
  onClear,
}: {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="sm" className="gap-1.5" />}>
        <History />
        <span className="hidden sm:inline">History</span>
        {entries.length > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 font-mono text-[10px] text-primary">{entries.length}</span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>History</SheetTitle>
          <SheetDescription>Your recent generations, stored only in this browser.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-4">
            {entries.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">Nothing yet. Generate some comments!</p>
            )}
            <AnimatePresence initial={false}>
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                  exit={{ opacity: 0, x: 40 }}
                  className="group relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onRestore(entry);
                      setOpen(false);
                    }}
                    className="w-full rounded-xl border bg-card/60 p-3 text-left transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <div className="mb-1 flex items-center gap-2 pr-7 text-xs text-muted-foreground">
                      <PlatformIcon platform={entry.post.platform} className="size-3" />
                      <span className="truncate">{entry.post.author ?? entry.analysis?.topic ?? "Pasted post"}</span>
                      <span className="ml-auto shrink-0">{timeAgo(entry.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm">{entry.post.text}</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {entry.comments.length} comment{entry.comments.length === 1 ? "" : "s"} ·{" "}
                      {entry.comments.map((c) => c.style_name).join(", ")}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Delete from history"
                    className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => onRemove(entry.id)}
                  >
                    <Trash2 />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
        {entries.length > 0 && (
          <div className="border-t p-4">
            <Button variant="destructive" size="sm" className="w-full" onClick={onClear}>
              <Trash2 /> Clear history
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
