"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useHistory, type HistoryEntry } from "@/hooks/use-history";
import { api, ApiError, streamGeneration } from "@/lib/api";
import { DEFAULT_STYLES, detectPlatform } from "@/lib/catalog";
import type { Comment, GenerationOptions, Post, PostAnalysis, RefineAction } from "@/lib/types";

export type InputMode = "text" | "link";
export type RunStatus = "idle" | "streaming" | "done" | "error";

export type CardState =
  | { status: "pending"; style: string }
  | { status: "failed"; style: string; message: string }
  | { status: "ready"; style: string; versions: Comment[]; index: number; busy: null | "regenerate" | "refine" };

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export function useStudio() {
  // ---- inputs -------------------------------------------------------------
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [options, setOptions] = useState<GenerationOptions>({
    platform: "auto",
    styles: DEFAULT_STYLES,
    length: "medium",
    use_emojis: false,
    persona: "",
  });

  // link preview (fetched before generating, optional)
  const [preview, setPreview] = useState<Post | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  // ---- results ------------------------------------------------------------
  const [status, setStatus] = useState<RunStatus>("idle");
  const [post, setPost] = useState<Post | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const history = useHistory();

  const updateOptions = useCallback(
    (patch: Partial<GenerationOptions>) => setOptions((prev) => ({ ...prev, ...patch })),
    [],
  );

  const toggleStyle = useCallback((key: string) => {
    setOptions((prev) => {
      const has = prev.styles.includes(key);
      if (has && prev.styles.length === 1) {
        toast.info("Pick at least one style.");
        return prev;
      }
      return { ...prev, styles: has ? prev.styles.filter((s) => s !== key) : [...prev.styles, key] };
    });
  }, []);

  const urlPlatform = mode === "link" ? detectPlatform(url) : null;
  const hasLinkPreview = mode === "link" && preview !== null && previewUrl === url.trim();
  const canGenerate =
    status !== "streaming" &&
    (mode === "text" ? text.trim().length > 0 : urlPlatform !== null) &&
    options.styles.length > 0;

  // ---- link preview -------------------------------------------------------
  const fetchPreview = useCallback(async () => {
    const target = url.trim();
    if (!detectPlatform(target)) {
      toast.error("That doesn't look like a valid link.");
      return;
    }
    setFetching(true);
    try {
      const result = await api.extract(target);
      setPreview(result);
      setPreviewUrl(target);
    } catch (err) {
      toast.error("Couldn't fetch that post", { description: errorMessage(err) });
    } finally {
      setFetching(false);
    }
  }, [url]);

  const editPreview = useCallback((value: string) => {
    setPreview((prev) => (prev ? { ...prev, text: value } : prev));
  }, []);

  // ---- generation ---------------------------------------------------------
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((prev) => (prev === "streaming" ? "done" : prev));
    setCards((prev) => {
      const next = { ...prev };
      for (const [key, card] of Object.entries(next)) {
        if (card.status === "pending") next[key] = { status: "failed", style: key, message: "Stopped" };
      }
      return next;
    });
  }, []);

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const styles = [...options.styles];
    const id = newId();
    setSessionId(id);
    setStatus("streaming");
    setError(null);
    setPost(null);
    setAnalysis(null);
    setOrder(styles);
    setCards(Object.fromEntries(styles.map((s) => [s, { status: "pending", style: s } as CardState])));

    const persona = options.persona?.trim() || null;
    const body =
      mode === "text"
        ? { ...options, persona, text: text.trim() }
        : hasLinkPreview
          ? { ...options, persona, text: preview!.text, url: url.trim() }
          : { ...options, persona, url: url.trim() };

    let streamedPost: Post | null = hasLinkPreview ? { ...preview!, source: "extracted" } : null;
    let streamedAnalysis: PostAnalysis | null = null;
    const collected: Comment[] = [];
    let failed = false;

    try {
      for await (const evt of streamGeneration(body, controller.signal)) {
        switch (evt.event) {
          case "post":
            // keep author metadata from a fetched preview when the user edited its text
            streamedPost = hasLinkPreview ? { ...preview!, ...evt.data, author: preview!.author ?? evt.data.author, author_handle: preview!.author_handle ?? evt.data.author_handle, source: "extracted" } : evt.data;
            setPost(streamedPost);
            break;
          case "analysis":
            streamedAnalysis = evt.data;
            setAnalysis(evt.data);
            break;
          case "comment":
            collected.push(evt.data);
            setCards((prev) => ({
              ...prev,
              [evt.data.style]: { status: "ready", style: evt.data.style, versions: [evt.data], index: 0, busy: null },
            }));
            break;
          case "comment_error":
            setCards((prev) => ({
              ...prev,
              [evt.data.style]: { status: "failed", style: evt.data.style, message: evt.data.message },
            }));
            break;
          case "error":
            failed = true;
            setError(evt.data.message);
            setStatus("error");
            setCards((prev) => {
              const next = { ...prev };
              for (const [key, card] of Object.entries(next)) {
                if (card.status === "pending") delete next[key];
              }
              return next;
            });
            setOrder((prev) => prev.filter((s) => collected.some((c) => c.style === s)));
            toast.error("Generation failed", { description: evt.data.message });
            break;
          case "done":
            break;
        }
      }
      if (!failed) setStatus("done");
      if (streamedPost && collected.length) {
        const ordered = styles.flatMap((s) => collected.filter((c) => c.style === s));
        history.save({ id, createdAt: Date.now(), post: streamedPost, analysis: streamedAnalysis, comments: ordered, options: { ...options, styles } });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message = errorMessage(err);
      setError(message);
      setStatus("error");
      setOrder([]);
      setCards({});
      toast.error("Generation failed", { description: message });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [canGenerate, options, mode, text, url, hasLinkPreview, preview, history]);

  // keep history in sync when a card changes after generation
  const persistCards = useCallback(
    (nextCards: Record<string, CardState>) => {
      if (!sessionId || !post) return;
      const comments = order.flatMap((s) => {
        const card = nextCards[s];
        return card?.status === "ready" ? [card.versions[card.index]] : [];
      });
      if (comments.length) history.save({ id: sessionId, createdAt: Date.now(), post, analysis, comments, options });
    },
    [sessionId, post, analysis, order, options, history],
  );

  const setCard = useCallback(
    (style: string, update: (card: CardState) => CardState, persist = false) => {
      setCards((prev) => {
        const card = prev[style];
        if (!card) return prev;
        const next = { ...prev, [style]: update(card) };
        if (persist) queueMicrotask(() => persistCards(next));
        return next;
      });
    },
    [persistCards],
  );

  const pushVersion = (comment: Comment) => (card: CardState): CardState =>
    card.status === "ready"
      ? { ...card, versions: [...card.versions, comment], index: card.versions.length, busy: null }
      : { status: "ready", style: comment.style, versions: [comment], index: 0, busy: null };

  const regenerate = useCallback(
    async (style: string) => {
      if (!post) return;
      const card = cards[style];
      const avoid = card?.status === "ready" ? card.versions.map((v) => v.text) : [];
      setCard(style, (c) => (c.status === "ready" ? { ...c, busy: "regenerate" } : { status: "pending", style }));
      try {
        const comment = await api.regenerate({
          post,
          style,
          length: options.length,
          use_emojis: options.use_emojis,
          persona: options.persona?.trim() || null,
          analysis,
          avoid,
        });
        setCard(style, pushVersion(comment), true);
      } catch (err) {
        setCard(style, (c) => (c.status === "ready" ? { ...c, busy: null } : { status: "failed", style, message: errorMessage(err) }));
        toast.error("Couldn't regenerate", { description: errorMessage(err) });
      }
    },
    [post, cards, options, analysis, setCard],
  );

  const refine = useCallback(
    async (style: string, action: RefineAction, instruction?: string) => {
      const card = cards[style];
      if (!post || card?.status !== "ready") return;
      setCard(style, (c) => (c.status === "ready" ? { ...c, busy: "refine" } : c));
      try {
        const comment = await api.refine({ post, comment: card.versions[card.index], action, instruction });
        setCard(style, pushVersion(comment), true);
      } catch (err) {
        setCard(style, (c) => (c.status === "ready" ? { ...c, busy: null } : c));
        toast.error("Couldn't refine", { description: errorMessage(err) });
      }
    },
    [post, cards, setCard],
  );

  const selectVersion = useCallback(
    (style: string, index: number) => {
      setCard(style, (c) => (c.status === "ready" ? { ...c, index: Math.max(0, Math.min(index, c.versions.length - 1)) } : c), true);
    },
    [setCard],
  );

  const restore = useCallback((entry: HistoryEntry) => {
    abortRef.current?.abort();
    const styles = entry.comments.map((c) => c.style);
    setSessionId(entry.id);
    setOptions({ ...entry.options });
    setPost(entry.post);
    setAnalysis(entry.analysis);
    setOrder(styles);
    setCards(
      Object.fromEntries(
        entry.comments.map((c) => [c.style, { status: "ready", style: c.style, versions: [c], index: 0, busy: null } as CardState]),
      ),
    );
    setError(null);
    setStatus("done");
    if (entry.post.url && entry.post.source === "extracted") {
      setMode("link");
      setUrl(entry.post.url);
      setPreview(entry.post);
      setPreviewUrl(entry.post.url);
    } else {
      setMode("text");
      setText(entry.post.text);
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setPost(null);
    setAnalysis(null);
    setOrder([]);
    setCards({});
    setError(null);
    setSessionId(null);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    // inputs
    mode,
    setMode,
    text,
    setText,
    url,
    setUrl: (value: string) => setUrl(value),
    options,
    updateOptions,
    toggleStyle,
    urlPlatform,
    preview: hasLinkPreview ? preview : null,
    editPreview,
    clearPreview: () => {
      setPreview(null);
      setPreviewUrl(null);
    },
    fetchPreview,
    fetching,
    canGenerate,
    // results
    status,
    post,
    analysis,
    order,
    cards,
    error,
    // actions
    generate,
    stop,
    regenerate,
    refine,
    selectVersion,
    restore,
    reset,
    history,
  };
}

export type Studio = ReturnType<typeof useStudio>;
