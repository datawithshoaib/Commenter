"use client";

import { Copy, RotateCcw } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { ApiStatus } from "@/components/api-status";
import { Logo } from "@/components/brand";
import { AnalysisPanel } from "@/components/studio/analysis-panel";
import { CommentCard, FailedCard, PendingCard } from "@/components/studio/comment-card";
import { Composer } from "@/components/studio/composer";
import { Controls } from "@/components/studio/controls";
import { EmptyState } from "@/components/studio/empty-state";
import { GenerateButton } from "@/components/studio/generate-button";
import { HistorySheet } from "@/components/studio/history-sheet";
import { StylePicker } from "@/components/studio/style-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useStudio } from "@/hooks/use-studio";

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] text-primary">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Studio() {
  const studio = useStudio();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { status, order, cards, post, analysis, history } = studio;

  const streaming = status === "streaming";
  const ready = order.filter((s) => cards[s]?.status === "ready").length;
  const settled = order.filter((s) => cards[s] && cards[s].status !== "pending").length;
  const hasResults = order.length > 0;
  const platform = post?.platform ?? (studio.options.platform === "auto" ? "linkedin" : studio.options.platform);

  // Ctrl/⌘ + Enter anywhere generates
  const generateRef = useRef(studio.generate);
  useEffect(() => {
    generateRef.current = studio.generate;
  }, [studio.generate]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        generateRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On small screens, bring results into view when a run starts
  useEffect(() => {
    if (streaming && window.innerWidth < 1024) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [streaming]);

  const copyAll = async () => {
    const texts = order.flatMap((s) => {
      const card = cards[s];
      return card?.status === "ready" ? [`[${card.versions[card.index].style_name}]\n${card.versions[card.index].text}`] : [];
    });
    try {
      await navigator.clipboard.writeText(texts.join("\n\n"));
      toast.success(`Copied ${texts.length} comments`);
    } catch {
      toast.error("Couldn't access the clipboard.");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-transparent backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <a href="#" className="flex items-center gap-2.5" aria-label="Commenter home">
            <Logo />
            <span className="font-heading text-xl tracking-tight">Commenter</span>
          </a>
          <div className="ml-auto flex items-center gap-1.5">
            <ApiStatus />
            <HistorySheet
              entries={history.entries}
              onRestore={studio.restore}
              onRemove={history.remove}
              onClear={history.clear}
            />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 sm:px-6">
        {/* Hero */}
        <section className="py-10 text-center sm:py-14">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            LinkedIn &amp; X · 8 comment styles · streaming
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl font-heading text-[2.6rem] leading-[1.05] tracking-tight sm:text-6xl"
          >
            Comments worth{" "}
            <span className="animate-gradient bg-[linear-gradient(90deg,oklch(0.65_0.24_285),oklch(0.7_0.22_340),oklch(0.72_0.15_210),oklch(0.65_0.24_285))] bg-[length:300%_100%] bg-clip-text text-transparent italic">
              replying to.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground sm:text-lg"
          >
            Paste a post or drop a link. Get thoughtful, human-sounding replies in several distinct styles, then refine
            each one in a click.
          </motion.p>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          {/* Left: composer */}
          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 160, damping: 24 }}
            className="space-y-6 rounded-3xl border bg-card/70 p-4 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.6)] backdrop-blur-xl sm:p-5 lg:sticky lg:top-20"
          >
            <Section step={1} title="The post">
              <Composer studio={studio} />
            </Section>
            <Section step={2} title="Comment styles">
              <StylePicker
                selected={studio.options.styles}
                onToggle={studio.toggleStyle}
                onPreset={(styles) => studio.updateOptions({ styles })}
              />
            </Section>
            <Section step={3} title="Fine-tune">
              <Controls options={studio.options} onChange={studio.updateOptions} />
            </Section>
            <GenerateButton
              streaming={streaming}
              disabled={!studio.canGenerate}
              progress={{ done: settled, total: order.length || studio.options.styles.length }}
              onGenerate={studio.generate}
              onStop={studio.stop}
            />
          </motion.aside>

          {/* Right: results */}
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 160, damping: 24 }}
            className="min-w-0 scroll-mt-20 space-y-4"
          >
            <AnimatePresence mode="wait" initial={false}>
              {!hasResults && status !== "streaming" ? (
                <motion.div key="empty" exit={{ opacity: 0, scale: 0.98 }}>
                  <EmptyState />
                </motion.div>
              ) : (
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {streaming ? (
                        <>Writing {order.length} comments in parallel…</>
                      ) : (
                        <>
                          {ready} comment{ready === 1 ? "" : "s"} ready
                        </>
                      )}
                    </p>
                    {!streaming && ready > 0 && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={copyAll}>
                          <Copy /> Copy all
                        </Button>
                        <Button variant="ghost" size="sm" onClick={studio.reset}>
                          <RotateCcw /> Clear
                        </Button>
                      </div>
                    )}
                  </div>

                  {(streaming || post) && <AnalysisPanel post={post} analysis={analysis} />}

                  <LayoutGroup>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <AnimatePresence mode="popLayout">
                        {order.map((style, i) => {
                          const card = cards[style];
                          if (!card) return null;
                          if (card.status === "pending") return <PendingCard key={`${style}-pending`} styleKey={style} index={i} />;
                          if (card.status === "failed")
                            return (
                              <FailedCard
                                key={`${style}-failed`}
                                styleKey={style}
                                message={card.message}
                                index={i}
                                onRetry={post ? () => studio.regenerate(style) : undefined}
                              />
                            );
                          return (
                            <CommentCard
                              key={`${style}-ready`}
                              card={card}
                              index={0}
                              platform={platform}
                              onRegenerate={() => studio.regenerate(style)}
                              onRefine={(action, instruction) => studio.refine(style, action, instruction)}
                              onSelectVersion={(index) => studio.selectVersion(style, index)}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </LayoutGroup>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Built with Next.js, FastAPI, LangChain, LangGraph and Groq. Always read a comment before you post it.
      </footer>
    </>
  );
}
