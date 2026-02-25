"use client"

import { useState, useMemo } from "react"

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
      payer_name: string | null
      receivable_value: string
      payment_value: string
      due_date: string | null
      payment_date: string | null
      confidence: number
    }>
    unmatched_receivables: Array<{
      debtor_cnpj: string | null
      debtor_name: string | null
      face_value: string
      due_date: string | null
    }>
    unmatched_payments: Array<{
      payer_cnpj: string | null
      payer_name: string | null
      amount: string
      date: string | null
    }>
  }
}

type StatusFilter = "all" | "conciliado" | "pendente" | "sem_recebivel"

interface Row {
  status: "conciliado" | "pendente" | "sem_recebivel"
  name: string
  cnpj: string
  receivableValue: string | null
  paymentValue: string | null
  dueDate: string | null
  paymentDate: string | null
  diff: string | null
  confidence: number | null
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num)
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  try {
    const d = new Date(value)
    return d.toLocaleDateString("pt-BR")
  } catch {
    return value
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "conciliado":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          PAGO
        </span>
      )
    case "pendente":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          NAO PAGO
        </span>
      )
    case "sem_recebivel":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          SEM TITULO
        </span>
      )
  }
}

function confidenceBadge(c: number | null) {
  if (c === null) return null
  const color =
    c >= 75
      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
      : c >= 50
      ? "bg-amber-50 text-amber-600 border-amber-200"
      : "bg-red-50 text-red-600 border-red-200"
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${color}`}>
      {c}%
    </span>
  )
}

export function ConciliationResult({ data, sessionToken }: ConciliationResultProps) {
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const { summary } = data

  const handleExport = () => {
    window.open(
      `${API_URL}/api/v1/instant/export?session_token=${sessionToken}`,
      "_blank"
    )
  }

  // Build unified row list
  const allRows: Row[] = useMemo(() => {
    const rows: Row[] = []

    for (const m of data.matches) {
      const recVal = parseFloat(m.receivable_value)
      const payVal = parseFloat(m.payment_value)
      const diff = payVal - recVal
      rows.push({
        status: "conciliado",
        name: m.debtor_name || m.payer_name || "—",
        cnpj: m.debtor_cnpj || "",
        receivableValue: m.receivable_value,
        paymentValue: m.payment_value,
        dueDate: m.due_date || null,
        paymentDate: m.payment_date || null,
        diff: diff !== 0 ? diff.toFixed(2) : null,
        confidence: m.confidence,
      })
    }

    for (const r of data.unmatched_receivables) {
      rows.push({
        status: "pendente",
        name: r.debtor_name || "—",
        cnpj: r.debtor_cnpj || "",
        receivableValue: r.face_value,
        paymentValue: null,
        dueDate: r.due_date,
        paymentDate: null,
        diff: null,
        confidence: null,
      })
    }

    for (const p of data.unmatched_payments) {
      rows.push({
        status: "sem_recebivel",
        name: p.payer_name || "—",
        cnpj: p.payer_cnpj || "",
        receivableValue: null,
        paymentValue: p.amount,
        dueDate: null,
        paymentDate: p.date,
        diff: null,
        confidence: null,
      })
    }

    return rows
  }, [data])

  // Filter + search
  const filteredRows = useMemo(() => {
    let rows = allRows
    if (filter !== "all") {
      rows = rows.filter((r) => r.status === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cnpj.includes(q)
      )
    }
    return rows
  }, [allRows, filter, search])

  // Totals
  const totalReceivables = allRows
    .filter((r) => r.receivableValue)
    .reduce((sum, r) => sum + parseFloat(r.receivableValue!), 0)
  const totalPayments = allRows
    .filter((r) => r.paymentValue)
    .reduce((sum, r) => sum + parseFloat(r.paymentValue!), 0)
  const totalPending = allRows
    .filter((r) => r.status === "pendente")
    .reduce((sum, r) => sum + parseFloat(r.receivableValue || "0"), 0)

  const filterCounts = {
    all: allRows.length,
    conciliado: allRows.filter((r) => r.status === "conciliado").length,
    pendente: allRows.filter((r) => r.status === "pendente").length,
    sem_recebivel: allRows.filter((r) => r.status === "sem_recebivel").length,
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Resultado da Conciliacao
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {summary.matched} de {summary.total_receivables} recebiveis conciliados ({summary.match_rate}%)
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-lg font-bold text-prysma-600">{summary.match_rate}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Taxa de conciliacao</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center">
          <div className="text-lg font-bold text-emerald-600">{formatCurrency(totalPayments)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total recebido</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 text-center">
          <div className="text-lg font-bold text-red-600">{formatCurrency(totalPending)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Pendente de recebimento</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-lg font-bold text-slate-700">{formatCurrency(totalReceivables)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total em recebiveis</div>
        </div>
      </div>

      {/* Filter tabs + Search */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            {([
              ["all", "Todos", filterCounts.all],
              ["conciliado", "Pagos", filterCounts.conciliado],
              ["pendente", "Nao pagos", filterCounts.pendente],
              ["sem_recebivel", "Sem titulo", filterCounts.sem_recebivel],
            ] as [StatusFilter, string, number][]).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-full sm:w-64 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-prysma-500/20 focus:border-prysma-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium w-[100px]">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Sacado / Pagador</th>
                <th className="text-left px-4 py-2.5 font-medium w-[160px]">CNPJ/CPF</th>
                <th className="text-right px-4 py-2.5 font-medium w-[130px]">Recebivel</th>
                <th className="text-right px-4 py-2.5 font-medium w-[130px]">Pagamento</th>
                <th className="text-right px-4 py-2.5 font-medium w-[100px]">Diferenca</th>
                <th className="text-center px-4 py-2.5 font-medium w-[70px]">Match</th>
                <th className="text-left px-4 py-2.5 font-medium w-[100px]">Vencimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-slate-50/50 transition-colors ${
                      row.status === "pendente" ? "bg-red-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">{statusBadge(row.status)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-slate-800 font-medium text-[13px]">{row.name}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-slate-400 font-mono text-xs">{row.cnpj || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.receivableValue ? (
                        <span className="text-slate-800 font-medium">{formatCurrency(row.receivableValue)}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.paymentValue ? (
                        <span className="text-emerald-600 font-medium">{formatCurrency(row.paymentValue)}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.diff ? (
                        <span className={`text-xs font-medium ${
                          parseFloat(row.diff) > 0 ? "text-emerald-600" : "text-red-600"
                        }`}>
                          {parseFloat(row.diff) > 0 ? "+" : ""}{formatCurrency(row.diff)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {confidenceBadge(row.confidence)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">
                      {row.dueDate ? formatDate(row.dueDate) : row.paymentDate ? formatDate(row.paymentDate) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals footer */}
            {filteredRows.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr className="font-semibold text-slate-700">
                  <td className="px-4 py-3" colSpan={3}>
                    Total ({filteredRows.length} registros)
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(
                      filteredRows
                        .filter((r) => r.receivableValue)
                        .reduce((s, r) => s + parseFloat(r.receivableValue!), 0)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {formatCurrency(
                      filteredRows
                        .filter((r) => r.paymentValue)
                        .reduce((s, r) => s + parseFloat(r.paymentValue!), 0)
                    )}
                  </td>
                  <td className="px-4 py-3" colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
