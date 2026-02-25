"use client"

import { useCallback, useState } from "react"

interface DropzoneProps {
  onFileUpload: (file: File) => void
  loading: boolean
  title: string
  subtitle: string
}

const ACCEPTED_TYPES = [".csv", ".xlsx", ".xls", ".ofx"]

export function Dropzone({ onFileUpload, loading, title, subtitle }: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFileUpload(e.dataTransfer.files[0])
      }
    },
    [onFileUpload]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        onFileUpload(e.target.files[0])
      }
    },
    [onFileUpload]
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">
          {title.includes("30") ? (
            <>
              {title.split("30")[0]}
              <span className="text-prysma-600">30 segundos</span>
            </>
          ) : (
            title
          )}
        </h1>
        <p className="text-lg text-slate-500">{subtitle}</p>
      </div>

      <label
        htmlFor="file-upload"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center w-full max-w-2xl h-72
          border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200
          ${
            dragActive
              ? "border-prysma-500 bg-prysma-50 scale-[1.02]"
              : "border-slate-300 bg-white hover:border-prysma-400 hover:bg-prysma-50/50"
          }
          ${loading ? "opacity-60 pointer-events-none" : ""}
        `}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-prysma-200 border-t-prysma-600 animate-spin" />
            <p className="text-slate-500 font-medium">Processando arquivo...</p>
          </div>
        ) : (
          <>
            <div className="h-16 w-16 rounded-2xl bg-prysma-100 flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-prysma-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-slate-700 mb-1">
              Arraste seu arquivo aqui
            </p>
            <p className="text-sm text-slate-400">
              ou clique para selecionar — CSV, XLSX, OFX
            </p>
          </>
        )}
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleChange}
          disabled={loading}
        />
      </label>

      <p className="mt-6 text-xs text-slate-400">
        Seus dados sao processados de forma segura e nao sao compartilhados.
      </p>
    </div>
  )
}
