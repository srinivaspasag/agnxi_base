import { cn } from "@/lib/utils";

const INDIGO = "#6366F1";

type LogoIconProps = {
  /** Size in pixels. Default 28. */
  size?: number;
  /** "indigo" = brand color; "white" = monochrome for dark backgrounds. */
  variant?: "indigo" | "white";
  className?: string;
};

/**
 * Logo mark: minimal abstract shape (unit / agent). No letterforms.
 * Flat, solid color only. No gradient, no glow, no animation. Favicon-safe.
 */
export function LogoIcon({
  size = 28,
  variant = "indigo",
  className,
}: LogoIconProps) {
  const color = variant === "white" ? "white" : INDIGO;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect
        x="4"
        y="4"
        width="24"
        height="24"
        rx="6"
        fill={color}
      />
    </svg>
  );
}
