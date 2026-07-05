import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  style,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border ${className}`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--surface-border)",
        borderRadius: "var(--radius-card)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "var(--shadow)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
