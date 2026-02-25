"use client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ConciliationResultProps {
  sessionToken: string
  data: {
    summary: {
      total_receivables: number
      total_payments: number
      matched: number
      unmatched_receivables: number
      unmatched_payments: number
      match_rate: number
    }
    matches: Array<{
      debtor_cnpj: string | null
      debtor_name: string | null
      receivable_value: number
      payment_value: number
      confidence: number
    }>
    unmatched_receivables: Array<{
      debtor_cnpj: string | null
      debtor_name: string | null
      face_value: number
      due_date: string | null
    }>
    unmatched_payments: Array<{
      payer_cnpj: string | null
      payer_name: string | null
      amount: number
      date: string | null
    }>
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function confidenceColor(c: number): string {
  if (c >= 75) return "text-emerald-600 bg-emerald-50"
  if (c >= 50) return "text-amber-600 bg-amber-50"
  return "text-red-600 bg-red-50"
}

export function ConciliationResult({ data, sessionToken }: ConciliationResultProps) {
  const { summary } = data

  const handleExport = () => {
    window.open(
      `${API_URL}/api/v1/instant/export?session_token=${sessionToken}`,
      "_blank"
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Conciliacao concluida
        </h2>
        <p className="text-slate-500">
          {summary.matched} de {summary.total_receivables} recebiveis conciliados
          automaticamente.
        </p>
        <button
          onClick={handleExport}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-2xl font-bold text-prysma-600">{summary.match_rate}%</div>
          <div className="text-xs text-slate-500 mt-1">Taxa de conciliacao</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-5 text-center">
          <div className="text-2xl font-bold text-emerald-600">{summary.matched}</div>
          <div className="text-xs text-slate-500 mt-1">Conciliados</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-5 text-center">
          <div className="text-2xl font-bold text-amber-600">
            {summary.unmatched_receivables}
          </div>
          <div className="text-xs text-slate-500 mt-1">Recebiveis pendentes</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-2xl font-bold text-slate-600">
            {summary.unmatched_payments}
          </div>
          <div className="text-xs text-slate-500 mt-1">Pagamentos sem match</div>
        </div>
      </div>

      {/* Matches Table */}
      {data.matches.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">
              Recebiveis conciliados ({data.matches.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Sacado</th>
                  <th className="text-right px-6 py-3 font-medium">Recebivel</th>
                  <th className="text-right px-6 py-3 font-medium">Pagamento</th>
                  <th className="text-center px-6 py-3 font-medium">Confianca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.matches.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="text-slate-700">{m.debtor_name || "—"}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {m.debtor_cnpj || ""}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(m.receivable_value)}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-emerald-600">
                      {formatCurrency(m.payment_value)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${confidenceColor(m.confidence)}`}
                      >
                        {m.confidence}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unmatched */}
      {data.unmatched_receivables.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/50">
            <h3 className="font-semibold text-amber-800">
              Recebiveis pendentes ({data.unmatched_receivables.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Sacado</th>
                  <th className="text-left px-6 py-3 font-medium">CNPJ/CPF</th>
                  <th className="text-right px-6 py-3 font-medium">Valor</th>
                  <th className="text-left px-6 py-3 font-medium">Vencimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.unmatched_receivables.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3 text-slate-700">{r.debtor_name || "—"}</td>
                    <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                      {r.debtor_cnpj || "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(r.face_value)}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {r.due_date || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="text-center bg-prysma-50 rounded-2xl border border-prysma-100 p-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Quer salvar e acompanhar ao longo do tempo?
        </h3>
        <p className="text-slate-500 mb-6 text-sm">
          Crie sua conta gratis e tenha acesso ao historico completo, scoring de risco e
          alertas automaticos por 30 dias.
        </p>
        <button className="px-6 py-3 bg-prysma-600 text-white rounded-xl font-semibold hover:bg-prysma-700 transition-colors">
          Criar conta gratis
        </button>
        <p className="mt-3 text-xs text-slate-400">
          Sem cartao de credito. Cancele quando quiser.
        </p>
      </div>
    </div>
  )
}
