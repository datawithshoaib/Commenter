/** Fixed, decorative background: drifting colour blobs over a faint grid. Pure CSS animation. */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute -top-[20%] left-[8%] h-[55vh] w-[55vw] animate-aurora rounded-full bg-[var(--glow-1)] blur-[110px]" />
      <div className="absolute -top-[10%] right-[-5%] h-[45vh] w-[45vw] animate-aurora rounded-full bg-[var(--glow-2)] blur-[120px] [animation-delay:-6s]" />
      <div className="absolute top-[35%] left-[30%] h-[40vh] w-[40vw] animate-aurora rounded-full bg-[var(--glow-3)] blur-[130px] [animation-delay:-11s]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
