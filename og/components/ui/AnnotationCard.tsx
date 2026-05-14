export function AnnotationCard({
  label,
  children,
  variant = "dark",
  size = "sm",
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  variant?: "dark" | "light" | "lime" | "yellow" | "orange";
  size?: "sm" | "md";
  className?: string;
}) {
  const styles = {
    dark: "bg-bg-dark text-ink-light border border-ink-light/10",
    light: "bg-bg-cream text-ink-dark border border-ink-dark/10",
    lime: "bg-accent-lime text-ink-dark",
    yellow: "bg-accent-yellow text-ink-dark",
    orange: "bg-accent-orange text-ink-dark",
  };

  return (
    <div className={`${styles[variant]} ${size === "sm" ? "p-4" : "p-6"} ${className}`}>
      <div className="font-mono text-label-sm uppercase tracking-widest opacity-70 mb-2">
        &#9654; {label}
      </div>
      <div className={size === "sm" ? "text-sm" : "text-base"}>{children}</div>
    </div>
  );
}
