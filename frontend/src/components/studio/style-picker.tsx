"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { PRESETS, STYLES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface Props {
  selected: string[];
  onToggle: (key: string) => void;
  onPreset: (styles: string[]) => void;
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export function StylePicker({ selected, onToggle, onPreset }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const active = sameSet(preset.styles, selected);
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onPreset(preset.styles)}
              className={cn(
                "relative rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active ? "border-transparent text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="preset-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{preset.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {STYLES.map((style, i) => {
          const active = selected.includes(style.key);
          const Icon = style.icon;
          const order = selected.indexOf(style.key);
          return (
            <motion.button
              key={style.key}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => onToggle(style.key)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i, type: "spring", stiffness: 300, damping: 26 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "group relative flex items-start gap-2.5 overflow-hidden rounded-xl border p-2.5 text-left transition-[background-color,border-color,box-shadow] duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? cn("border-transparent bg-card ring-1", style.accent.ring, "shadow-[0_8px_30px_-12px_var(--glow-1)]")
                  : "bg-background/40 hover:bg-card/80",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300",
                  style.accent.glow,
                  active && "opacity-100",
                )}
              />
              <span
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:rotate-[-6deg]",
                  style.accent.bg,
                  style.accent.text,
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{style.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{style.tagline}</span>
              </span>
              <span
                className={cn(
                  "relative flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                  active ? "border-transparent bg-primary text-primary-foreground" : "border-border",
                )}
              >
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span
                      key="on"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 25 }}
                    >
                      {selected.length > 1 ? order + 1 : <Check className="size-3" />}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
