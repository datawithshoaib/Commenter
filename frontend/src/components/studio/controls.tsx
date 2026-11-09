"use client";

import { Smile, UserRound } from "lucide-react";

import { LinkedInIcon, XIcon } from "@/components/brand";
import { Segmented } from "@/components/studio/segmented";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LENGTHS } from "@/lib/catalog";
import type { GenerationOptions, PlatformChoice } from "@/lib/types";

const PLATFORM_OPTIONS: { value: PlatformChoice; label: React.ReactNode }[] = [
  { value: "auto", label: "Auto" },
  {
    value: "linkedin",
    label: (
      <>
        <LinkedInIcon className="size-3" /> LinkedIn
      </>
    ),
  },
  {
    value: "x",
    label: (
      <>
        <XIcon className="size-3" /> X
      </>
    ),
  },
];

export function Controls({
  options,
  onChange,
}: {
  options: GenerationOptions;
  onChange: (patch: Partial<GenerationOptions>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Platform</Label>
          <Segmented
            ariaLabel="Platform"
            value={options.platform}
            onChange={(platform) => onChange({ platform })}
            options={PLATFORM_OPTIONS}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Length</Label>
          <Segmented
            ariaLabel="Length"
            value={options.length}
            onChange={(length) => onChange({ length })}
            options={LENGTHS}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="persona" className="text-xs text-muted-foreground">
            Your voice <span className="opacity-60">(optional)</span>
          </Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="persona"
              value={options.persona ?? ""}
              onChange={(e) => onChange({ persona: e.target.value })}
              maxLength={300}
              placeholder="e.g. Data engineer who loves dev tools"
              className="h-9 rounded-lg bg-background/60 pl-9"
            />
          </div>
        </div>
        <label className="flex h-9 cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 text-sm select-none">
          <span className="inline-flex items-center gap-2">
            <Smile className="size-4 text-muted-foreground" /> Emojis
          </span>
          <Switch checked={options.use_emojis} onCheckedChange={(use_emojis) => onChange({ use_emojis })} />
        </label>
      </div>
    </div>
  );
}
