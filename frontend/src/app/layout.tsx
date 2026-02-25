import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Prysma — Conciliacao Inteligente de Recebiveis",
  description:
    "Arraste seu arquivo e veja seus recebíveis conciliados em 30 segundos. Sem cadastro, sem configuração.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
