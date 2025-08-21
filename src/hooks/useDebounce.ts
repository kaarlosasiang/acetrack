import { useRef } from "react";

// Debounce function with proper TypeScript typing
export const useDebounce = <T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFunction = (...args: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current); // Clear the previous timeout
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args); // Call the function after the delay
    }, delay);
  };

  return debouncedFunction;
};
