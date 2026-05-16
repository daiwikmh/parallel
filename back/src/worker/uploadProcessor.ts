import { extractFromRow, type ExtractedEntity, type ExtractedEdge } from '../agent/extract'
import {
  upsertEntity,
  insertEdge,
  insertTrace,
  updateUploadProgress,
  getCommission,
  getEntity,
} from '../db/repo'
import { addActivity } from '../agent/activity'
import { evaluateAndFire } from '../alerts/engine'
import type { NewsItem } from '../lib/types'

export interface ProcessUploadInput {
  uploadId: string
  commissionId: string
  rows: Array<Record<string, string>>
  headers: string[]
  filename?: string
}

export async function processUploadAsync(input: ProcessUploadInput): Promise<void> {
  const { uploadId, commissionId, rows, headers } = input
  const commission = getCommission(commissionId)
  const commissionEntity = commission?.entity_id ? getEntity(commission.entity_id) : null
  const commissionName = commissionEntity?.canonical_name ?? commission?.query_text ?? ''
  const commissionType = commissionEntity?.type

  let processed = 0
  let totalEntities = 0
  let totalEdges = 0
  const allEntities: ExtractedEntity[] = []
  const allEdges: ExtractedEdge[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const { result, source } = await extractFromRow(row, headers, {
        commissionName,
        commissionType,
        filename: input.filename,
        rowIndex: i,
      })
      if (source.trace) {
        insertTrace({ trace: source.trace, model: source.model, kind: 'chat', commission_id: commissionId })
      }

      for (const ent of result.entities) {
        const attrs: Record<string, unknown> = {}
        if (typeof ent.sentiment === 'number') {
          attrs.sentiment = ent.sentiment
          attrs.sentiment_at = Date.now()
        }
        attrs.from_upload = uploadId
        upsertEntity({
          canonical_id: ent.canonical_id,
          type: ent.type,
          name: ent.name,
          aliases: ent.aliases,
          attributes: attrs,
        })
      }

      const rowEvidence = JSON.stringify(row).slice(0, 500)
      const observedAt = Date.now()
      for (const edge of result.edges) {
        insertEdge({
          src_id: edge.src_canonical_id,
          dst_id: edge.dst_canonical_id,
          type: edge.type,
          observed_at: observedAt,
          properties: { ...edge.properties, source_row: rowEvidence, upload_id: uploadId },
          evidence: edge.evidence,
          article_id: null,
          trace_id: source.trace?.request_id ?? null,
          confidence: edge.confidence,
          commission_id: commissionId,
        })
      }

      allEntities.push(...result.entities)
      allEdges.push(...result.edges)
      totalEntities += result.entities.length
      totalEdges += result.edges.length
      processed++
    } catch (e) {
      errors.push(`row ${i + 1}: ${(e as Error).message}`)
    }
    updateUploadProgress(uploadId, {
      rows_processed: processed,
      entities_added: totalEntities,
      edges_added: totalEdges,
    })
  }

  const status: 'completed' | 'partial' | 'failed' =
    processed === 0 ? 'failed' : processed < rows.length ? 'partial' : 'completed'
  updateUploadProgress(uploadId, {
    status,
    error: errors.length ? errors.slice(0, 3).join('; ') : null,
  })

  addActivity(
    'UPLOAD',
    `done ${uploadId} · ${processed}/${rows.length} rows · ${totalEntities} entities · ${totalEdges} edges${errors.length ? ` · ${errors.length} err` : ''}`,
  )

  if (allEntities.length || allEdges.length) {
    try {
      const syntheticArticle: NewsItem = {
        id: `upload:${uploadId}`,
        title: `Upload ${input.filename ?? uploadId}`,
        summary: `Dataset upload with ${processed} processed rows`,
        url: `upload://${uploadId}`,
        publishedAt: new Date().toISOString(),
        source: { kind: 'rss', name: 'csv-upload' },
      } as NewsItem
      const fired = await evaluateAndFire({
        commissionId,
        article: syntheticArticle,
        entities: allEntities,
        edges: allEdges,
      })
      if (fired.length > 0) addActivity('ALERT', `${fired.length} alert${fired.length === 1 ? '' : 's'} fired from upload`)
    } catch (e) {
      addActivity('WARN', `upload alert engine failed: ${(e as Error).message}`)
    }
  }
}
