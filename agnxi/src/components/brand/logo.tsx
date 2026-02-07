import { cn } from "@/lib/utils";
import { LogoIcon } from "./logo-icon";

const INDIGO = "#6366F1";

type AgnxiLogoProps = {
  className?: string;
  /** Show symbol next to wordmark. Default true for lockup. */
  showIcon?: boolean;
  /** Icon size in px when showIcon. Default 24. */
  iconSize?: number;
};

/**
 * Agnxi lockup: optional symbol + wordmark. Flat, solid indigo. No glow, no gradient, no animation.
 * Enterprise-grade. Linear / Stripe / Vercel quality.
 */
export function AgnxiLogo({
  className,
  showIcon = true,
  iconSize = 24,
}: AgnxiLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 select-none", className)}
    >
      {showIcon && <LogoIcon size={iconSize} variant="indigo" />}
      <span
        className="font-bold tracking-[0.04em]"
        style={{ color: INDIGO }}
      >
        Agnxi
      </span>
    </span>
  );
}
