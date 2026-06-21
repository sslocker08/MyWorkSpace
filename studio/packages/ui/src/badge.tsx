import { forwardRef } from "react";
import { cn } from "./cn";

export type BadgeVariant =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/** Badge — label/tag. Tokens-only; status colors carry an accessible text pair. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "neutral", className, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("mwui-badge", `mwui-badge--${variant}`, className)}
        {...rest}
      />
    );
  },
);

Badge.displayName = "Badge";
