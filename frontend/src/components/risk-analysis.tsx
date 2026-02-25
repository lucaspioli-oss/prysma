"use client"

import { useState } from "react"

interface RiskFlag {
  type: string
  severity: string
  message: string
}

interface RiskAlert {
  priority: string
  action: string
  reason: string
  cnpj?: string
  name?: string
  exposure?: string
}

interface DebtorAnalysis {
  cnpj: string
  name: string
  score: string
  score_value: number
  exposure: string
  flags: RiskFlag[]
  alerts: RiskAlert[]
  company_info: {
    situacao: string | null
    porte: string | null
    capital_social: string | null
    data_abertura: string | null
    natureza_juridica: string | null
    cnae: string | null
    uf: string | null
  }
  payment_history: {
    total: number
    paid: number
    late: number
    unpaid: number
    partial: number
    avg_days_late: string | null
    recovery_rate: string | null
  }
}

interface RiskData {
  portfolio_summary: {
    total_debtors: number
    total_exposure: string
    value_at_risk: string
    risk_percentage: number
    score_distribution: Record<string, number>
  }
  alerts: RiskAlert[]
  debtors: DebtorAnalysis[]
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num)
}

function scoreColor(score: string): string {
  switch (score) {
    case "A": return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "B": return "bg-blue-100 text-blue-700 border-blue-200"
    case "C": return "bg-amber-100 text-amber-700 border-amber-200"
    case "D": return "bg-orange-100 text-orange-700 border-orange-200"
    case "E": return "bg-red-100 text-red-700 border-red-200"
    default: return "bg-slate-100 text-slate-700 border-slate-200"
  }
}

function scoreBgBar(score: string): string {
  switch (score) {
    case "A": return "bg-emerald-500"
    case "B": return "bg-blue-500"
    case "C": return "bg-amber-500"
    case "D": return "bg-orange-500"
    case "E": return "bg-red-500"
    default: return "bg-slate-500"
  }
}

function priorityStyle(priority: string): string {
  switch (priority) {
    case "urgente": return "bg-red-50 border-red-200 text-red-800"
    case "alta": return "bg-orange-50 border-orange-200 text-orange-800"
    case "media": return "bg-amber-50 border-amber-200 text-amber-800"
    case "info": return "bg-blue-50 border-blue-200 text-blue-800"
    default: return "bg-slate-50 border-slate-200 text-slate-800"
  }
}

function priorityLabel(priority: string): string {
  switch (priority) {
    case "urgente": return "URGENTE"
    case "alta": return "ALTA"
    case "media": return "MEDIA"
    case "info": return "INFO"
    default: return priority.toUpperCase()
  }
}

function severityDot(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-500"
    case "high": return "bg-orange-500"
    case "medium": return "bg-amber-500"
    case "low": return "bg-blue-500"
    default: return "bg-slate-400"
  }
}

export function RiskAnalysis({ data }: { data: RiskData }) {
  const [expandedDebtor, setExpandedDebtor] = useState<string | null>(null)
  const { portfolio_summary, alerts, debtors } = data

  const scoreLabels: Record<string, string> = {
    A: "Excelente",
    B: "Bom",
    C: "Moderado",
    D: "Alto",
    E: "Critico",
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Analise de Risco da Carteira
        </h2>
        <p className="text-slate-500">
          {portfolio_summary.total_debtors} sacados analisados — dados da Receita Federal + historico de pagamento
        </p>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-2xl font-bold text-slate-900">
            {portfolio_summary.total_debtors}
          </div>
          <div className="text-xs text-slate-500 mt-1">Sacados analisados</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-lg font-bold text-slate-900">
            {formatCurrency(portfolio_summary.total_exposure)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Exposicao total</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-5 text-center">
          <div className="text-lg font-bold text-red-600">
            {formatCurrency(portfolio_summary.value_at_risk)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Valor em risco (D+E)</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-2xl font-bold text-slate-900">
            {portfolio_summary.risk_percentage}%
          </div>
          <div className="text-xs text-slate-500 mt-1">% em risco</div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Distribuicao de Score</h3>
        <div className="flex gap-2 h-8">
          {["A", "B", "C", "D", "E"].map((score) => {
            const count = portfolio_summary.score_distribution[score] || 0
            const pct = portfolio_summary.total_debtors > 0
              ? (count / portfolio_summary.total_debtors) * 100
              : 0
            if (count === 0) return null
            return (
              <div
                key={score}
                className={`${scoreBgBar(score)} rounded-md flex items-center justify-center text-white text-xs font-bold min-w-[40px] transition-all`}
                style={{ width: `${Math.max(pct, 8)}%` }}
                title={`Score ${score}: ${count} sacados (${pct.toFixed(0)}%)`}
              >
                {score}: {count}
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-500">
          {["A", "B", "C", "D", "E"].map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${scoreBgBar(s)}`} />
              {s} = {scoreLabels[s]}
            </span>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">
            Alertas e Recomendacoes ({alerts.length})
          </h3>
          {alerts.slice(0, 10).map((alert, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 ${priorityStyle(alert.priority)}`}
            >
              <div className="flex items-start gap-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                  alert.priority === "urgente" ? "bg-red-200 text-red-800" :
                  alert.priority === "alta" ? "bg-orange-200 text-orange-800" :
                  alert.priority === "media" ? "bg-amber-200 text-amber-800" :
                  "bg-blue-200 text-blue-800"
                }`}>
                  {priorityLabel(alert.priority)}
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    {alert.name || alert.cnpj}
                    {alert.exposure && (
                      <span className="font-normal text-slate-500 ml-2">
                        ({formatCurrency(alert.exposure)})
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium mt-1">{alert.action}</div>
                  <div className="text-xs mt-1 opacity-75">{alert.reason}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Debtor List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">
            Sacados por risco ({debtors.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {debtors.map((d) => (
            <div key={d.cnpj}>
              <button
                onClick={() => setExpandedDebtor(expandedDebtor === d.cnpj ? null : d.cnpj)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
              >
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border text-lg font-bold ${scoreColor(d.score)}`}>
                  {d.score}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{d.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{d.cnpj}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900">
                    {formatCurrency(d.exposure)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Risco: {d.score_value}/100
                  </div>
                </div>
                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform ${expandedDebtor === d.cnpj ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedDebtor === d.cnpj && (
                <div className="px-6 pb-6 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    {/* Company Info */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                        Dados da Empresa
                      </h4>
                      <dl className="space-y-2 text-sm">
                        {d.company_info.situacao && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Situacao</dt>
                            <dd className={`font-medium ${
                              d.company_info.situacao === "ATIVA" ? "text-emerald-600" : "text-red-600"
                            }`}>{d.company_info.situacao}</dd>
                          </div>
                        )}
                        {d.company_info.porte && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Porte</dt>
                            <dd className="text-slate-900">{d.company_info.porte}</dd>
                          </div>
                        )}
                        {d.company_info.capital_social && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Capital Social</dt>
                            <dd className="text-slate-900">{formatCurrency(d.company_info.capital_social)}</dd>
                          </div>
                        )}
                        {d.company_info.data_abertura && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Abertura</dt>
                            <dd className="text-slate-900">{d.company_info.data_abertura}</dd>
                          </div>
                        )}
                        {d.company_info.natureza_juridica && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Natureza</dt>
                            <dd className="text-slate-900 text-right max-w-[200px] truncate">{d.company_info.natureza_juridica}</dd>
                          </div>
                        )}
                        {d.company_info.uf && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">UF</dt>
                            <dd className="text-slate-900">{d.company_info.uf}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Payment History */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                        Historico de Pagamento
                      </h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Total de recebiveis</dt>
                          <dd className="text-slate-900 font-medium">{d.payment_history.total}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Pagos</dt>
                          <dd className="text-emerald-600 font-medium">{d.payment_history.paid}</dd>
                        </div>
                        {d.payment_history.late > 0 && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Pagos com atraso</dt>
                            <dd className="text-amber-600 font-medium">{d.payment_history.late}</dd>
                          </div>
                        )}
                        {d.payment_history.unpaid > 0 && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Nao pagos</dt>
                            <dd className="text-red-600 font-medium">{d.payment_history.unpaid}</dd>
                          </div>
                        )}
                        {d.payment_history.avg_days_late && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Atraso medio</dt>
                            <dd className="text-slate-900">{parseFloat(d.payment_history.avg_days_late).toFixed(0)} dias</dd>
                          </div>
                        )}
                        {d.payment_history.recovery_rate && (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Taxa de recuperacao</dt>
                            <dd className="text-slate-900">{parseFloat(d.payment_history.recovery_rate).toFixed(1)}%</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>

                  {/* Flags */}
                  {d.flags.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Fatores de risco
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {d.flags.map((f, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-700"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${severityDot(f.severity)}`} />
                            {f.message}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
