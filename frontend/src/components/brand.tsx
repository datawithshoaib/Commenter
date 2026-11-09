import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/types";
import { Globe } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-8 items-center justify-center", className)}>
      <span className="absolute inset-0 animate-gradient rounded-[10px] bg-[linear-gradient(135deg,oklch(0.65_0.24_285),oklch(0.7_0.22_340),oklch(0.75_0.15_210),oklch(0.65_0.24_285))] bg-[length:300%_300%] shadow-[0_4px_24px_-4px_var(--glow-1)]" />
      <svg viewBox="0 0 24 24" className="relative size-[18px] text-white" fill="none" aria-hidden>
        <path
          d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V15h0a2 2 0 0 1-2-2V6.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M12 7.2l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6Z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41Z" />
    </svg>
  );
}

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  if (platform === "linkedin") return <LinkedInIcon className={cn("text-[#0A66C2] dark:text-[#4c9bea]", className)} />;
  if (platform === "x") return <XIcon className={className} />;
  return <Globe className={className} />;
}
