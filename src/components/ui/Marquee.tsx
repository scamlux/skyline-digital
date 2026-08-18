/**
 * Infinite ticker along the horizon. Content is duplicated for a seamless
 * loop; pauses on hover. Pure CSS animation.
 */
export function Marquee({ items }: { items: string[] }) {
  const row = (ariaHidden: boolean) => (
    <div className="marquee-track" aria-hidden={ariaHidden}>
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="flex items-center gap-8 px-8 font-mono text-xs uppercase tracking-[0.2em] text-mist"
        >
          {item}
          <span className="sun-disc inline-block h-1.5 w-1.5 opacity-60" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="marquee border-y border-line-night bg-night py-4">
      {row(false)}
      {row(true)}
    </div>
  );
}
