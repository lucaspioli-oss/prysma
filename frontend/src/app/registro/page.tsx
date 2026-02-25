"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroForm />
    </Suspense>
  )
}

function RegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionToken = searchParams.get("session")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          session_token: sessionToken,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Erro ao criar conta")
      }

      const data = await res.json()
      localStorage.setItem("prysma_token", data.token)
      localStorage.setItem("prysma_user", JSON.stringify(data.user))
      router.push("/app")
    } catch (e: any) {
      setError(e.message || "Erro de conexao com o servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-prysma-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-prysma-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">Prysma</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Criar conta gratis</h1>
          <p className="text-sm text-slate-500 mb-6">
            30 dias gratis. Sem cartao de credito.
          </p>

          {sessionToken && (
            <div className="mb-6 rounded-lg bg-prysma-50 border border-prysma-200 p-3 text-sm text-prysma-700">
              Seus dados de conciliacao serao vinculados a sua conta.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Nome da empresa
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Minha ESC Ltda"
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-prysma-500/20 focus:border-prysma-400"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-prysma-500/20 focus:border-prysma-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                required
                minLength={6}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-prysma-500/20 focus:border-prysma-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-prysma-600 text-white rounded-xl font-semibold hover:bg-prysma-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Criando conta..." : "Criar conta gratis"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Ja tem conta?{" "}
            <Link href="/login" className="text-prysma-600 font-medium hover:text-prysma-700">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
