import {
  BookOpen,
  Heart,
  Laugh,
  Lightbulb,
  MessageCircleQuestion,
  Scale,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { Length, Platform, PlatformChoice, RefineAction } from "@/lib/types";

export interface StyleMeta {
  key: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  /** Tailwind classes for the style's accent (kept literal so Tailwind can see them). */
  accent: { text: string; bg: string; ring: string; glow: string; bar: string };
}

/** Mirrors backend `app/styles.py`; keys must match. */
export const STYLES: StyleMeta[] = [
  {
    key: "insightful",
    name: "Thought Leader",
    tagline: "Adds a sharp, non-obvious insight",
    icon: Lightbulb,
    accent: {
      text: "text-amber-500 dark:text-amber-300",
      bg: "bg-amber-500/12",
      ring: "ring-amber-500/40",
      glow: "from-amber-400/25",
      bar: "bg-amber-400",
    },
  },
  {
    key: "supportive",
    name: "Cheerleader",
    tagline: "Specific, genuine appreciation",
    icon: Heart,
    accent: {
      text: "text-rose-500 dark:text-rose-300",
      bg: "bg-rose-500/12",
      ring: "ring-rose-500/40",
      glow: "from-rose-400/25",
      bar: "bg-rose-400",
    },
  },
  {
    key: "curious",
    name: "Conversation Starter",
    tagline: "Asks a question worth answering",
    icon: MessageCircleQuestion,
    accent: {
      text: "text-sky-500 dark:text-sky-300",
      bg: "bg-sky-500/12",
      ring: "ring-sky-500/40",
      glow: "from-sky-400/25",
      bar: "bg-sky-400",
    },
  },
  {
    key: "storyteller",
    name: "Storyteller",
    tagline: "A short, relatable experience",
    icon: BookOpen,
    accent: {
      text: "text-emerald-600 dark:text-emerald-300",
      bg: "bg-emerald-500/12",
      ring: "ring-emerald-500/40",
      glow: "from-emerald-400/25",
      bar: "bg-emerald-400",
    },
  },
  {
    key: "contrarian",
    name: "Devil's Advocate",
    tagline: "Respectful pushback or nuance",
    icon: Scale,
    accent: {
      text: "text-orange-600 dark:text-orange-300",
      bg: "bg-orange-500/12",
      ring: "ring-orange-500/40",
      glow: "from-orange-400/25",
      bar: "bg-orange-400",
    },
  },
  {
    key: "witty",
    name: "Wit",
    tagline: "Clever, light humor",
    icon: Laugh,
    accent: {
      text: "text-fuchsia-600 dark:text-fuchsia-300",
      bg: "bg-fuchsia-500/12",
      ring: "ring-fuchsia-500/40",
      glow: "from-fuchsia-400/25",
      bar: "bg-fuchsia-400",
    },
  },
  {
    key: "expert",
    name: "Value Adder",
    tagline: "A practical tip or framework",
    icon: Wrench,
    accent: {
      text: "text-teal-600 dark:text-teal-300",
      bg: "bg-teal-500/12",
      ring: "ring-teal-500/40",
      glow: "from-teal-400/25",
      bar: "bg-teal-400",
    },
  },
  {
    key: "concise",
    name: "One-Liner",
    tagline: "Punchy, high-signal reaction",
    icon: Zap,
    accent: {
      text: "text-yellow-600 dark:text-yellow-300",
      bg: "bg-yellow-500/12",
      ring: "ring-yellow-500/40",
      glow: "from-yellow-400/25",
      bar: "bg-yellow-400",
    },
  },
];

export const STYLE_BY_KEY: Record<string, StyleMeta> = Object.fromEntries(STYLES.map((s) => [s.key, s]));

export const DEFAULT_STYLES = ["insightful", "supportive", "curious", "witty"];

export const PRESETS: { label: string; styles: string[] }[] = [
  { label: "Balanced", styles: DEFAULT_STYLES },
  { label: "Spark replies", styles: ["curious", "contrarian", "storyteller"] },
  { label: "Build authority", styles: ["insightful", "expert", "contrarian"] },
  { label: "Quick & friendly", styles: ["concise", "supportive", "witty"] },
  { label: "All 8", styles: STYLES.map((s) => s.key) },
];

export const LENGTHS: { value: Length; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

export const PLATFORM_CHOICES: { value: PlatformChoice; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
];

export const PLATFORM_LABEL: Record<Platform, string> = {
  linkedin: "LinkedIn",
  x: "X",
  other: "Web",
};

export const REFINE_OPTIONS: { action: Exclude<RefineAction, "custom">; label: string }[] = [
  { action: "shorter", label: "Make it shorter" },
  { action: "longer", label: "Make it longer" },
  { action: "casual", label: "More casual" },
  { action: "professional", label: "More professional" },
  { action: "add_question", label: "End with a question" },
  { action: "remove_emojis", label: "Remove emojis" },
];

export const X_CHAR_LIMIT = 280;

export function detectPlatform(url: string): Platform | null {
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "linkedin.com" || host.endsWith(".linkedin.com") || host === "lnkd.in") return "linkedin";
    if (["x.com", "twitter.com", "mobile.twitter.com", "fxtwitter.com", "vxtwitter.com"].includes(host)) return "x";
    return "other";
  } catch {
    return null;
  }
}
