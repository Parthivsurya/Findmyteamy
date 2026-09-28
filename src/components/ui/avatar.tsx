import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "size-6 text-[0.6rem]",
  sm: "size-8 text-[0.68rem]",
  md: "size-10 text-[0.8rem]",
  lg: "size-14 text-[1rem]",
  xl: "size-20 text-[1.3rem]",
} as const;

/**
 * Initials on a plain background when there is no photo.
 *
 * The only round thing in the interface. Every other rectangle is `rounded-box`
 * (3px); a portrait is round because faces are, and that is the documented
 * exception to the one-radius rule rather than a drift in it.
 */
export function Avatar({
  name,
  image,
  size = "md",
  className,
  ring = false,
}: {
  name: string;
  image?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  const shell = cn(
    "shrink-0 overflow-hidden rounded-full border border-line",
    sizes[size],
    ring && "border-2",
    className,
  );

  if (image) {
    // A plain <img> keeps avatars working without the image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} className={cn(shell, "object-cover")} />;
  }

  return (
    <span
      aria-hidden
      className={cn(
        shell,
        "flex items-center justify-center bg-surface-2 font-semibold text-ink-2",
      )}
    >
      {initials(name)}
    </span>
  );
}
