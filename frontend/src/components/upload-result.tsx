"use client"

interface UploadResultProps {
  receivablesCount: number
  paymentsCount: number
  onConciliate: () => void
  loading: boolean
}

export function UploadResult({
  receivablesCount,
  paymentsCount,
  onConciliate,
  loading,
}: UploadResultProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Pronto para conciliar</h2>
        <p className="text-slate-500">Veja o que encontramos nos seus dados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-1">Recebiveis encontrados</div>
          <div className="text-3xl font-bold text-slate-900">{receivablesCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-1">Pagamentos encontrados</div>
          <div className="text-3xl font-bold text-slate-900">{paymentsCount}</div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onConciliate}
          disabled={loading}
          className={`
            inline-flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold
            transition-all duration-200
            ${
              loading
                ? "bg-prysma-300 text-white cursor-wait"
                : "bg-prysma-600 text-white hover:bg-prysma-700 hover:shadow-lg hover:shadow-prysma-200"
            }
          `}
        >
          {loading ? (
            <>
              <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Conciliando...
            </>
          ) : (
            "Conciliar agora"
          )}
        </button>
        <p className="mt-3 text-sm text-slate-400">
          Vamos cruzar seus recebiveis com os pagamentos automaticamente.
        </p>
      </div>
    </div>
  )
}
