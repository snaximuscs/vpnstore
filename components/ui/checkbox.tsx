"use client";
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

const checkboxVariants = cva(
  [
    "peer shrink-0 rounded-sm border border-border",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "focus-visible:ring-offset-background focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
    "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary",
    "bg-accent text-foreground transition-colors shadow-sm",
  ].join(" "),
  {
    variants: {
      size: {
        sm:      "h-3 w-3",
        default: "h-4 w-4",
        lg:      "h-5 w-5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const CHECK_PATH  = "M3 6l3 3 6-6";
const MINUS_PATH  = "M3 6h8";

interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  label?: string;
  description?: string;
  error?: string;
}

const CheckboxRoot = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, size, label, description, error, id, ...props }, ref) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const generatedId = React.useId();
  const checkboxId  = id ?? generatedId;
  const iconSize    = size === "sm" ? 10 : size === "lg" ? 14 : 12;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <CheckboxPrimitive.Root
          ref={ref}
          id={checkboxId}
          className={cn(checkboxVariants({ size }), className)}
          {...props}
        >
          <CheckboxPrimitive.Indicator asChild>
            <div className="flex items-center justify-center text-current">
              <AnimatePresence mode="wait">
                {props.checked === "indeterminate" ? (
                  <motion.svg
                    key="indeterminate"
                    width={iconSize}
                    height={iconSize}
                    viewBox="0 0 14 14"
                    fill="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <motion.path
                      d={MINUS_PATH}
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="check"
                    width={iconSize}
                    height={iconSize}
                    viewBox="0 0 14 14"
                    fill="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <motion.path
                      d={CHECK_PATH}
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3, ease: "easeInOut", delay: 0.05 }}
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </div>
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>

        {(label || description) && (
          <div className="grid gap-1.5 leading-none pt-0.5">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-sm leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive ml-6">{error}</p>
      )}
    </div>
  );
});
CheckboxRoot.displayName = "Checkbox";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>((props, ref) => <CheckboxRoot ref={ref} {...props} />);
Checkbox.displayName = "Checkbox";

export { Checkbox, checkboxVariants, type CheckboxProps };
