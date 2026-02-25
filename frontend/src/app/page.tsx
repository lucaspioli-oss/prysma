import Link from "next/link"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-prysma-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold text-slate-900">
              Prysma<span className="text-prysma-600">Q</span>
            </span>
          </div>
          <Link
            href="/app"
            className="px-5 py-2 bg-prysma-600 text-white text-sm font-medium rounded-lg hover:bg-prysma-700 transition-colors"
          >
            Testar gratis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-prysma-50/50 to-white" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-prysma-50 border border-prysma-200 rounded-full text-sm text-prysma-700 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-prysma-500" />
              Para ESCs, factorings e cooperativas
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
              Concilie seus recebiveis em{" "}
              <span className="text-prysma-600">30 segundos</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl">
              Arraste seu arquivo. Sem cadastro. Sem configuracao.
              Descubra quem pagou, quem nao pagou e exporte o relatorio na hora.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/app"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-prysma-600 text-white text-lg font-semibold rounded-xl hover:bg-prysma-700 hover:shadow-lg hover:shadow-prysma-200 transition-all"
              >
                Testar gratis agora
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <span className="inline-flex items-center text-sm text-slate-400 pl-2">
                Gratis por 30 dias. Sem cartao de credito.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-t border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              Como funciona
            </h2>
            <p className="text-slate-500">
              Tres passos. Trinta segundos. Zero configuracao.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative bg-white rounded-2xl border border-slate-200 p-8">
              <div className="h-12 w-12 rounded-xl bg-prysma-100 flex items-center justify-center mb-5">
                <svg className="h-6 w-6 text-prysma-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-xs font-bold text-prysma-600 mb-2">PASSO 1</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Arraste seus arquivos</h3>
              <p className="text-sm text-slate-500">
                CSV de recebiveis, extrato OFX do banco, planilha XLSX — aceita tudo.
                Detectamos as colunas automaticamente.
              </p>
            </div>
            {/* Step 2 */}
            <div className="relative bg-white rounded-2xl border border-slate-200 p-8">
              <div className="h-12 w-12 rounded-xl bg-prysma-100 flex items-center justify-center mb-5">
                <svg className="h-6 w-6 text-prysma-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div className="text-xs font-bold text-prysma-600 mb-2">PASSO 2</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Cruzamos automaticamente</h3>
              <p className="text-sm text-slate-500">
                Nosso motor cruza recebiveis com pagamentos por valor, CNPJ e data.
                Cada match tem um score de confianca.
              </p>
            </div>
            {/* Step 3 */}
            <div className="relative bg-white rounded-2xl border border-slate-200 p-8">
              <div className="h-12 w-12 rounded-xl bg-prysma-100 flex items-center justify-center mb-5">
                <svg className="h-6 w-6 text-prysma-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <div className="text-xs font-bold text-prysma-600 mb-2">PASSO 3</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Exporte o relatorio</h3>
              <p className="text-sm text-slate-500">
                Veja quem pagou, quem nao pagou e quem pagou parcial.
                Exporte tudo em CSV com um clique.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Para quem */}
      <section className="border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Voce gasta 3 horas por dia conferindo extrato?
              </h2>
              <p className="text-slate-500 mb-8">
                Se voce opera uma ESC, factoring ou cooperativa, sabe como e:
                abrir o extrato, abrir a planilha, CTRL+F em cada nome, marcar um por um.
                Todo dia. Todo santo dia.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Nomes que nunca batem (TED vs PIX vs boleto)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Valores com centavos de diferenca</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Pagamentos parciais e atrasados</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">200 recebiveis x 150 pagamentos = caos no Excel</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-prysma-50 to-slate-50 rounded-2xl border border-slate-200 p-10 text-center">
              <div className="text-6xl font-bold text-prysma-600 mb-2">30s</div>
              <p className="text-slate-500 mb-6">
                E o tempo que o PrysmaQ leva pra fazer
                o que voce faz em 3 horas.
              </p>
              <div className="space-y-3 text-left max-w-xs mx-auto">
                <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-slate-100">
                  <span className="text-sm text-slate-600">Excel manual</span>
                  <span className="text-sm font-semibold text-red-500">~3 horas</span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-prysma-200">
                  <span className="text-sm text-slate-600">PrysmaQ</span>
                  <span className="text-sm font-semibold text-prysma-600">30 segundos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              Inteligente de verdade
            </h2>
            <p className="text-slate-500">Nao e so um CTRL+F glorificado.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-2xl mb-3">📄</div>
              <h4 className="font-semibold text-slate-900 mb-1">Multi-formato</h4>
              <p className="text-sm text-slate-500">CSV, XLSX e extratos OFX. Detecta colunas sozinho.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-2xl mb-3">🎯</div>
              <h4 className="font-semibold text-slate-900 mb-1">Match inteligente</h4>
              <p className="text-sm text-slate-500">Cruza por valor, CNPJ e data com tolerancia a pequenas diferencas.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-2xl mb-3">📊</div>
              <h4 className="font-semibold text-slate-900 mb-1">Score de confianca</h4>
              <p className="text-sm text-slate-500">Cada match tem um score de 0-100%. Voce sabe exatamente o que revisar.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-2xl mb-3">⬇️</div>
              <h4 className="font-semibold text-slate-900 mb-1">Exporta CSV</h4>
              <p className="text-sm text-slate-500">Relatorio completo com status de cada recebivel. Um clique.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Pronto pra parar de sofrer com Excel?
          </h2>
          <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto">
            Arraste seu arquivo e veja a magica acontecer.
            Sem cadastro, sem cartao, sem compromisso.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-10 py-5 bg-prysma-600 text-white text-lg font-semibold rounded-xl hover:bg-prysma-700 hover:shadow-lg hover:shadow-prysma-200 transition-all"
          >
            Testar gratis agora
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="mt-4 text-sm text-slate-400">
            Gratis por 30 dias. Sem cartao de credito.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-prysma-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="text-sm text-slate-500">
              PrysmaQ by DrexQuant
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Seus dados sao processados de forma segura e nao sao compartilhados.
          </p>
        </div>
      </footer>
    </main>
  )
}
