'use client'

const SUGGESTIONS = [
  { prompt: 'What was the overall Malaysia CPI index in 2020?' },
  { prompt: 'For transport CPI, which was higher: 2024 or 2025?' },
  { prompt: 'What was Malaysia overall CPI in 1950?' },
  {
    prompt:
      'what is the CPI for transport in the year of 2014, please export CPI data for the year of 2024',
  },
]

export function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 pb-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-6">
        <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <h1 className="text-2xl font-semibold text-foreground text-balance mb-2">
        How can I help you today?
      </h1>
      <p className="text-sm text-muted-foreground text-balance max-w-md mb-10">
        Ask about Malaysia CPI (1960–2025): divisions, trends, comparisons, and data exports.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSuggestion(s.prompt)}
            className="flex items-start gap-3 text-left p-3.5 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group"
          >
            <span className="text-primary text-xs mt-1 shrink-0">✦</span>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors text-pretty leading-snug">
              {s.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
