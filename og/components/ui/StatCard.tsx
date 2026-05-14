import { BracketCard } from "./BracketCard";

export function StatCard({
  label,
  value,
  description,
  variant = "light",
}: {
  label: string;
  value: string;
  description?: string;
  variant?: "light" | "dark";
}) {
  const textColor = variant === "dark" ? "text-ink-light" : "text-ink-dark";
  const mutedColor = variant === "dark" ? "text-ink-light-muted" : "text-ink-dark-muted";

  return (
    <BracketCard variant={variant}>
      <div className={`font-mono text-label-sm uppercase tracking-widest opacity-70 mb-3 ${textColor}`}>
        &#9654; {label}
      </div>
      <div className={`font-display text-h1 font-bold leading-none ${textColor}`}>
        {value}
      </div>
      {description && (
        <div className={`mt-3 font-mono text-xs max-w-xs ${mutedColor}`}>
          {description}
        </div>
      )}
    </BracketCard>
  );
}
