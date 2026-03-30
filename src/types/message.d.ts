type GuardrailStatus = 'passed' | 'blocked_offtopic' | 'blocked_year'

type ExportInfo = {
  downloadUrl: string
  filename: string
  division: string
  divisionSummary: string
  startYear: string
  endYear: string
  recordCount: number
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  guardrailStatus?: GuardrailStatus
  exportInfo?: ExportInfo
  /** Round-trip time from send to stream complete (assistant messages only). */
  latencyMs?: number
}
