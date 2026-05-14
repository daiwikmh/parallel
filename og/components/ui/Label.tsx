export function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-mono text-label uppercase tracking-widest ${className}`}>
      <span className="inline-block mr-2">&#9654;</span>
      {children}
    </span>
  );
}
