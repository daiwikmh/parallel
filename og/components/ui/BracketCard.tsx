export function BracketCard({
  children,
  variant = "light",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "light" | "dark" | "lime";
  className?: string;
}) {
  const colors = {
    light: "text-ink-dark/40",
    dark: "text-ink-light/40",
    lime: "text-accent-lime",
  };

  return (
    <div className={`relative ${className}`}>
      <span className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 ${colors[variant]}`} />
      <span className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 ${colors[variant]}`} />
      <span className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 ${colors[variant]}`} />
      <span className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 ${colors[variant]}`} />
      <div className="p-6">{children}</div>
    </div>
  );
}
