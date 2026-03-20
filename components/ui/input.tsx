"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, X } from "lucide-react";

const inputVariants = cva(
  "flex w-full rounded-ele border border-border bg-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm",
  {
    variants: {
      variant: {
        default:     "border-border",
        destructive: "border-destructive focus-visible:ring-destructive",
        ghost:
          "border-transparent bg-accent focus-visible:bg-input focus-visible:border-border",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm:      "h-8 px-2 py-1 text-xs",
        lg:      "h-10 px-4 py-2",
        xl:      "h-12 px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      type = "text",
      leftIcon,
      rightIcon,
      error,
      clearable,
      onClear,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(
      props.defaultValue ?? ""
    );

    const internalRef = React.useRef<HTMLInputElement>(null);
    const inputRef = (ref ?? internalRef) as React.RefObject<HTMLInputElement>;

    const inputVariant = error ? "destructive" : variant;
    const isPassword   = type === "password";
    const actualType   = isPassword && showPassword ? "text" : type;

    const isControlled = value !== undefined;
    const inputValue   = isControlled ? value : internalValue;
    const showClear    = clearable && inputValue && String(inputValue).length > 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalValue(e.target.value);
      props.onChange?.(e);
    };

    const handleClear = () => {
      const el = inputRef.current;
      if (el) {
        el.value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (!isControlled) setInternalValue("");
      onClear?.();
      props.onChange?.({
        target: { value: "" },
        currentTarget: { value: "" },
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.ChangeEvent<HTMLInputElement>);
    };

    // Strip defaultValue from rest to avoid passing it to the controlled input
    const { defaultValue: _dv, ...rest } = props;

    return (
      <div className="relative w-full">
        {/* Left icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0 z-10 pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          type={actualType}
          className={cn(
            inputVariants({ variant: inputVariant, size, className }),
            leftIcon && "pl-10",
            (rightIcon || isPassword || showClear) && "pr-10"
          )}
          ref={inputRef}
          {...(isControlled ? { value: inputValue } : { defaultValue: _dv })}
          onChange={handleChange}
          {...rest}
        />

        {/* Right icons */}
        {(rightIcon || isPassword || showClear) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            {rightIcon && (
              <div className="text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
                {rightIcon}
              </div>
            )}
            {showClear && (
              <button
                type="button"
                onClick={handleClear}
                tabIndex={-1}
                className="text-muted-foreground hover:text-foreground transition-colors [&_svg]:size-4 [&_svg]:shrink-0"
              >
                <X />
              </button>
            )}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="text-muted-foreground hover:text-foreground transition-colors [&_svg]:size-4 [&_svg]:shrink-0"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
