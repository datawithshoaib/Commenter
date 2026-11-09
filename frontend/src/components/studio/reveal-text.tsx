"use client";

import { motion, useReducedMotion } from "motion/react";

/** Reveals text word by word with a soft blur-in. Line breaks are preserved. */
export function RevealText({ text, animate = true }: { text: string; animate?: boolean }) {
  const reduce = useReducedMotion();
  if (!animate || reduce) return <p className="whitespace-pre-line">{text}</p>;

  const tokens = text.split(/(\s+)/);
  const step = Math.min(0.035, 1.2 / Math.max(tokens.length, 1));
  let wordIndex = 0;
  return (
    <p className="whitespace-pre-line" aria-label={text}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
        const delay = wordIndex++ * step;
        return (
          <motion.span
            key={i}
            aria-hidden
            className="inline-block"
            initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {token}
          </motion.span>
        );
      })}
    </p>
  );
}
