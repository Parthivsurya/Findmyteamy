import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "size-7 text-[0.625rem]",
  sm: "size-9 text-[0.7rem]",
  md: "size-12 text-[0.85rem]",
  lg: "size-16 text-[1.05rem]",
  xl: "size-24 text-[1.5rem]",
} as const;

/**
 * Avatars fall back to initials on the brand gradient, so a profile without a
 * photo still looks deliberate rather than broken.
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
    "relative shrink-0 overflow-hidden rounded-full",
    sizes[size],
    ring && "ring-2 ring-surface outline outline-1 outline-line",
    className,
  );

  if (image) {
    return (
      // A plain <img> keeps avatars working without the image optimizer, which
      // matters for local development and self-hosted deployments.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name} className={cn(shell, "object-cover")} />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        shell,
        "brand-gradient flex items-center justify-center font-bold text-white",
      )}
    >
      {initials(name)}
    </span>
  );
}
