export interface EditorialPiece {
  rootHash: string;
  txHash: string;
  headline: string;
  take: string;
  topic: string;
  style: string;
  createdAt: Date;
  pieceIndex: number;
  blockNumber: number;
  sourceUrl?: string;
  sourceTitle?: string;
}

export type Topic = "ai" | "crypto" | "tech" | "policy" | "culture";

export interface AgentStatus {
  isLive: boolean;
  totalPieces: number;
  totalRevenue: string;
  computeSpent: string;
  walletBalance: string;
  recentActivity: ActivityEntry[];
}

export interface ActivityEntry {
  timestamp: string;
  action: string;
  detail: string;
  txHash?: string;
}
