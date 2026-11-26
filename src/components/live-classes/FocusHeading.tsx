import { useEffect, useRef, type ReactNode } from "react";

/**
 * Page heading that takes focus when it mounts. Used for class room states that
 * replace the whole view when a class goes live/ends, so keyboard and screen
 * reader users are not left on a removed element.
 */
export function FocusHeading({ children, className = "" }: Readonly<{ children: ReactNode; className?: string }>) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className={`focus:outline-none ${className}`}>
      {children}
    </h1>
  );
}
