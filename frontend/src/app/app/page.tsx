"use client"

import { useState } from "react"
import Link from "next/link"
import { Dropzone } from "@/components/dropzone"
import { UploadResult } from "@/components/upload-result"
import { ConciliationResult } from "@/components/conciliation-result"

type Step = "dropzone" | "second-file" | "preview" | "results"

interface UploadSummary {
  receivables_count: number
  payments_count: number
  errors: Array<{ row: number; error: string }>
}

interface RecordData {
  debtor_cnpj?: string | null
  debtor_name?: string | null
  payer_cnpj?: string | null
  payer_name?: string | null
  face_value?: number
  amount?: number
  due_date?: string | null
  date?: string | null
  status?: string
}

interface UploadData {
  session_token: string
  summary: UploadSummary
  receivables: RecordData[]
  payments: RecordData[]
}

interface ConciliationData {
  run_id: string
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AppPage() {
  const [step, setStep] = useState<Step>("dropzone")
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [totalReceivables, setTotalReceivables] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)
  const [uploadData, setUploadData] = useState<UploadData | null>(null)
  const [conciliationData, setConciliationData] = useState<ConciliationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (file: File) => {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)
    if (sessionToken) {
      formData.append("session_token", sessionToken)
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/instant/upload`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Erro ao processar arquivo")
      }

      const data: UploadData = await res.json()

      if (!sessionToken) {
        setSessionToken(data.session_token)
        setTotalReceivables(data.summary.receivables_count)
        setTotalPayments(data.summary.payments_count)
        setUploadData(data)
        setStep("second-file")
      } else {
        setTotalReceivables((prev) => prev + data.summary.receivables_count)
        setTotalPayments((prev) => prev + data.summary.payments_count)
        setUploadData(data)
        setStep("preview")
      }
    } catch (e: any) {
      setError(e.message || "Erro de conexao com o servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleSkipSecondFile = () => {
    setStep("preview")
  }

  const handleConciliate = async () => {
    if (!sessionToken) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `${API_URL}/api/v1/instant/conciliate?session_token=${sessionToken}`,
        { method: "POST" }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Erro ao conciliar")
      }

      const data: ConciliationData = await res.json()
      setConciliationData(data)
      setStep("results")
    } catch (e: any) {
      setError(e.message || "Erro de conexao com o servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep("dropzone")
    setSessionToken(null)
    setTotalReceivables(0)
    setTotalPayments(0)
    setUploadData(null)
    setConciliationData(null)
    setError(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-prysma-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-prysma-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold text-slate-900">
              Prysma<span className="text-prysma-600">Q</span>
            </span>
          </Link>
          {step !== "dropzone" && (
            <button
              onClick={handleReset}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Novo arquivo
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === "dropzone" && (
          <Dropzone
            onFileUpload={handleFileUpload}
            loading={loading}
            title="Concilie seus recebiveis em 30 segundos"
            subtitle="Sem cadastro. Sem configuracao. Arraste seu arquivo de recebiveis."
          />
        )}

        {step === "second-file" && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-sm text-emerald-700 mb-6">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {totalReceivables} recebiveis + {totalPayments} pagamentos encontrados
              </div>
            </div>
            <Dropzone
              onFileUpload={handleFileUpload}
              loading={loading}
              title="Agora arraste o arquivo de pagamentos"
              subtitle="Extrato bancario, OFX ou CSV com os pagamentos recebidos."
            />
            <div className="text-center">
              <button
                onClick={handleSkipSecondFile}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors underline"
              >
                Pular — conciliar apenas com o que ja foi enviado
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <UploadResult
            receivablesCount={totalReceivables}
            paymentsCount={totalPayments}
            onConciliate={handleConciliate}
            loading={loading}
          />
        )}

        {step === "results" && conciliationData && (
          <ConciliationResult data={conciliationData} sessionToken={sessionToken!} />
        )}
      </div>
    </main>
  )
}
