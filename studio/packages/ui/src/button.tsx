import { forwardRef } from "react";
import { cn } from "./cn";

export type ButtonIntent = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: ButtonIntent;
  size?: ButtonSize;
  /** Shows a spinner, marks aria-busy, and disables interaction. */
  loading?: boolean;
  /** Validation outline states (the 7th/8th of the required 8). */
  error?: boolean;
  success?: boolean;
}

/**
 * Button — ships all 8 states: default / hover / :focus-visible / :active /
 * disabled / loading / error / success (styles in styles/components.css).
 * Tokens only; no inline colors. Consumers import "@mwstudio/ui/styles.css".
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      intent = "primary",
      size = "md",
      loading = false,
      error = false,
      success = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-state={error ? "error" : success ? "success" : undefined}
        className={cn(
          "mwui-btn",
          `mwui-btn--${intent}`,
          `mwui-btn--${size}`,
          loading && "is-loading",
          error && "is-error",
          success && "is-success",
          className,
        )}
        {...rest}
      >
        {loading && <span className="mwui-btn__spinner" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
