import Image from "next/image";

/**
 * Project preview in a browser frame. Screenshots are clean 16:9 hero shots;
 * on hover the frame lifts and the shot zooms in slightly.
 */
export function PreviewCard({
  image,
  title,
  url,
  sizes,
  priority = false,
}: {
  image: string;
  title: string;
  url?: string;
  sizes: string;
  priority?: boolean;
}) {
  const host = url ? new URL(url).host : "skyline.digital";
  return (
    <div className="overflow-hidden rounded-xl border border-line-night bg-night-deep transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_50px_rgba(19,26,44,0.45)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-line-night px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-afterglow/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-apricot/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-mist/40" />
        <span className="ml-3 truncate rounded-md bg-night px-3 py-1 font-mono text-[10px] text-mist">
          {host}
        </span>
      </div>
      <div className="preview-zoom preview-loading relative aspect-video overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover object-top"
        />
      </div>
    </div>
  );
}
