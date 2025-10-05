import { cn } from "@/lib/utils";

export default function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-4xl mx-auto px-5 lg:px-0 w-full bg-transparent relative",
        className
      )}
    >
      {children}
    </div>
  );
}
