"use client";

import { ClipboardPaste, Link2, Loader2, ScanSearch, Type, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { PlatformIcon } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Studio } from "@/hooks/use-studio";
import { PLATFORM_LABEL } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const SAMPLE =
  "We cancelled every recurring meeting for 30 days.\n\nResult: shipping speed up 40%, Slack noise down, and the team said they finally had time to think.\n\nWe're keeping it. Async by default, meetings by exception.";

async function readClipboard(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    toast.error("Clipboard access was blocked. Paste with Ctrl/⌘ + V instead.");
    return null;
  }
}

export function Composer({ studio }: { studio: Studio }) {
  const { mode, setMode, text, setText, url, setUrl, urlPlatform, preview, fetching } = studio;

  return (
    <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)} className="gap-3">
      <TabsList className="grid h-10 w-full grid-cols-2 bg-muted/70 p-1">
        <TabsTrigger value="text" className="h-full gap-2">
          <Type /> Paste text
        </TabsTrigger>
        <TabsTrigger value="link" className="h-full gap-2">
          <Link2 /> From link
        </TabsTrigger>
      </TabsList>

      <TabsContent value="text">
        <div className="group relative">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the LinkedIn or X post you want to reply to…"
            aria-label="Post text"
            className="min-h-44 resize-y rounded-xl bg-background/60 pb-10 text-[15px] leading-relaxed backdrop-blur transition-shadow focus-visible:shadow-[0_0_0_4px_var(--glow-1)]"
          />
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="xs"
                onClick={async () => {
                  const clip = await readClipboard();
                  if (clip) setText(clip);
                }}
              >
                <ClipboardPaste /> Paste
              </Button>
              {!text && (
                <Button variant="ghost" size="xs" onClick={() => setText(SAMPLE)}>
                  Try a sample
                </Button>
              )}
              {text && (
                <Button variant="ghost" size="xs" onClick={() => setText("")}>
                  <X /> Clear
                </Button>
              )}
            </div>
            <span className="pr-1 font-mono text-[11px] text-muted-foreground tabular-nums">
              {text.length.toLocaleString()} chars
            </span>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="link" className="space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            studio.fetchPreview();
          }}
        >
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={urlPlatform ?? "none"}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="inline-flex"
                >
                  {urlPlatform ? (
                    <PlatformIcon platform={urlPlatform} className="size-4" />
                  ) : (
                    <Link2 className="size-4 text-muted-foreground" />
                  )}
                </motion.span>
              </AnimatePresence>
            </div>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/posts/…  or  https://x.com/…/status/…"
              aria-label="Post link"
              inputMode="url"
              className="h-11 rounded-xl bg-background/60 pr-24 pl-9 backdrop-blur"
            />
            <div className="absolute inset-y-0 right-1.5 flex items-center">
              {url ? (
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear link" onClick={() => setUrl("")}>
                  <X />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={async () => {
                    const clip = await readClipboard();
                    if (clip) setUrl(clip.trim());
                  }}
                >
                  <ClipboardPaste /> Paste
                </Button>
              )}
            </div>
          </div>
          <Button type="submit" variant="secondary" className="h-11 rounded-xl px-4" disabled={!urlPlatform || fetching}>
            {fetching ? <Loader2 className="animate-spin" /> : <ScanSearch />}
            Preview
          </Button>
        </form>

        <AnimatePresence initial={false} mode="popLayout">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="rounded-xl border bg-background/60 p-3 backdrop-blur"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-fuchsia-500/80 text-xs font-semibold text-white">
                  {(preview.author ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-medium">{preview.author ?? "Unknown author"}</p>
                  {preview.author_handle && (
                    <p className="truncate text-xs text-muted-foreground">@{preview.author_handle}</p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  <PlatformIcon platform={preview.platform} className="size-3" />
                  {PLATFORM_LABEL[preview.platform]}
                </span>
                <Button variant="ghost" size="icon-xs" aria-label="Discard preview" onClick={studio.clearPreview}>
                  <X />
                </Button>
              </div>
              <Textarea
                value={preview.text}
                onChange={(e) => studio.editPreview(e.target.value)}
                aria-label="Extracted post text"
                className="max-h-64 min-h-24 resize-y border-none bg-transparent px-0 text-sm leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Extracted text is editable. Tweak it before generating.</p>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn("px-1 text-xs text-muted-foreground")}
            >
              Works with public LinkedIn posts and X posts. Preview is optional; you can generate straight from the
              link.
            </motion.p>
          )}
        </AnimatePresence>
      </TabsContent>
    </Tabs>
  );
}
