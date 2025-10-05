"use client";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "./button";

export interface InputProps extends React.ComponentProps<"input"> {
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [inputType, setInputType] = React.useState(type);

    React.useEffect(() => {
      if (type === "password") {
        setInputType(showPassword ? "text" : "password");
      } else {
        setInputType(type);
      }
    }, [type, showPassword]);

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const isPasswordField = type === "password";

    return (
      <div className="relative">
        <input
          type={inputType}
          data-slot="input"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            isPasswordField && "pr-10", // Add right padding when toggle is present
            className
          )}
          ref={ref}
          {...props}
        />
        {isPasswordField && (
          <Button
            onClick={togglePasswordVisibility}
            type="button"
            className="absolute right-0 top-1/2 -translate-y-1/2 hover:!bg-transparent"
            variant={"ghost"}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
