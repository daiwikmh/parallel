export function BracketInput({
  placeholder,
  className = "",
  ...props
}: {
  placeholder: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`relative inline-flex w-full ${className}`}>
      <span className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-current opacity-60" />
      <span className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-current opacity-60" />
      <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l border-current opacity-60" />
      <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-current opacity-60" />
      <input
        placeholder={placeholder}
        className="w-full bg-transparent px-4 py-3 text-sm placeholder:opacity-40 focus:outline-none"
        {...props}
      />
    </div>
  );
}
