// ─── Graph (frontend-facing) ──────────────────────────────────────────────────
// What the API returns to the frontend for graph visualization.
import type { EntityType } from './news.types'


export interface GraphNode {
  id: string        
  label: string     
  type: EntityType
  pieceCount: number
  firstSeen: number
  lastSeen: number
}

export interface GraphEdge {
  source: string    
  target: string    
  weight: number
  sharedPieces: string[]
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}