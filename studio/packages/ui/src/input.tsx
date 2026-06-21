import { forwardRef } from "react";
import { cn } from "./cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

/**
 * Input — default / hover / :focus-visible / filled / disabled / error /
 * success states. Sets aria-invalid on error. Tokens-only styling.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, success = false, className, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={error || undefined}
        className={cn(
          "mwui-input",
          error && "mwui-input--error",
          success && "mwui-input--success",
          className,
        )}
        {...rest}
      />
    );
  },
);

Input.displayName = "Input";
