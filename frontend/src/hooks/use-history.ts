"use client";

import { useCallback, useEffect, useState } from "react";

import type { Comment, GenerationOptions, Post, PostAnalysis } from "@/lib/types";

export interface HistoryEntry {
  id: string;
  createdAt: number;
  post: Post;
  analysis: PostAnalysis | null;
  comments: Comment[];
  options: GenerationOptions;
}

const KEY = "commenter.history.v1";
const LIMIT = 25;

function read(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // storage may be full or disabled; history is a convenience only
  }
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    // localStorage is only available after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(read());
  }, []);

  const save = useCallback((entry: HistoryEntry) => {
    setEntries((prev) => {
      const next = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, LIMIT);
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setEntries([]);
  }, []);

  return { entries, save, remove, clear };
}
