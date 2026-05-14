import { BracketCard } from "../ui/BracketCard";
import type { EditorialPiece } from "@/lib/types";
import { INFT_ADDRESS } from "@/lib/mock";

function ProofRow({ label, value, link }: { label: string; value: string; link?: string }) {
  const display = value.length > 20 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
  return (
    <div className="flex items-center justify-between gap-4 font-mono text-sm">
      <span className="text-label-sm uppercase tracking-widest opacity-60 whitespace-nowrap">&#9654; {label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener" className="text-accent-lime hover:text-accent-lime-bright transition-colors truncate">
          {display} &#8599;
        </a>
      ) : (
        <span className="text-ink-light truncate">{display}</span>
      )}
    </div>
  );
}

export function OnChainProof({ piece }: { piece: EditorialPiece }) {
  return (
    <BracketCard variant="lime" className="bg-bg-dark text-ink-light">
      <div className="font-mono text-label uppercase tracking-widest text-accent-lime mb-2">
        &#9654; ON-CHAIN VERIFICATION
      </div>
      <p className="text-sm text-ink-light-muted mb-6 font-mono">
        Don&apos;t trust me. Verify me.
      </p>
      <div className="space-y-4">
        <ProofRow
          label="STORAGE HASH"
          value={piece.rootHash}
          link={`https://scan.0g.ai/storage/${piece.rootHash}`}
        />
        <ProofRow
          label="CHAIN TX"
          value={piece.txHash}
          link={`https://scan.0g.ai/tx/${piece.txHash}`}
        />
        <ProofRow
          label="INFT RECORD"
          value={`Piece #${piece.pieceIndex} by agent #0`}
          link={`https://scan.0g.ai/token/${INFT_ADDRESS}/0`}
        />
        <ProofRow
          label="BLOCK"
          value={piece.blockNumber.toLocaleString()}
        />
      </div>
    </BracketCard>
  );
}
