type Variant = "lime" | "dark" | "light" | "ghost-dark" | "ghost-light";

export function Button({
  variant = "lime",
  size = "md",
  children,
  className = "",
  ...props
}: {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<Variant, string> = {
    lime: "bg-accent-lime text-ink-dark hover:bg-accent-lime-bright",
    dark: "bg-bg-dark text-ink-light hover:bg-bg-dark-2",
    light: "bg-bg-cream text-ink-dark hover:bg-bg-cream-2",
    "ghost-dark": "border border-ink-dark/20 text-ink-dark hover:bg-ink-dark/5",
    "ghost-light": "border border-ink-light/20 text-ink-light hover:bg-ink-light/5",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-7 py-3.5 text-lg",
  };

  return (
    <button
      className={`font-medium rounded-md transition-colors cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
