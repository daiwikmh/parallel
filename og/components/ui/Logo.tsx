import Image from "next/image";

export function Logo() {
  return (
    <div className="inline-flex items-center gap-2">
      <Image src="/logo.png" alt="Frame0" width={28} height={28} className="shrink-0" />
      <div className="font-display text-2xl font-bold tracking-tight relative inline-flex items-start">
        <span>Frame0</span>
        <span className="text-accent-lime ml-0.5 text-sm relative -top-1">&apos;</span>
      </div>
    </div>
  );
}
