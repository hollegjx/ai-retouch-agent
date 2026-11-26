import { useRef, useState } from 'react'
import { ACCEPTED_TYPES } from '@/lib/assets'
import { checkFile } from '@/hooks/useAssets'
import { errorMessage } from '@/utils/errors'

export default function ImageDropzone({
  onFile,
  disabled,
  hint,
  multiple,
  maxFiles,
}: {
  onFile: (file: File) => void | Promise<void>
  disabled?: boolean
  hint?: string
  multiple?: boolean
  maxFiles?: number
}) {
  const input = useRef<HTMLInputElement>(null)
  const processing = useRef(false)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accept = async (files: File[]) => {
    if (disabled || processing.current || !files.length) return
    const selected = multiple ? files : files.slice(0, 1)
    if (maxFiles !== undefined && selected.length > maxFiles) {
      setError(`还可以添加 ${maxFiles} 张图片，请减少选择数量`)
      return
    }
    const problem = selected.map(checkFile).find(Boolean)
    if (problem) {
      setError(problem)
      return
    }
    processing.current = true
    setBusy(true)
    setError(null)
    try {
      for (const file of selected) await onFile(file)
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      processing.current = false
      setBusy(false)
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled && !busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void accept(Array.from(event.dataTransfer.files))
        }}
        className={`flex w-full flex-col items-center gap-3 rounded-card border border-dashed px-4 py-8 disabled:opacity-50 ${dragging ? 'border-brand bg-brand-soft' : 'border-line-strong bg-soft hover:border-brand'}`}
      >
        <svg className="size-8 text-muted" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 16V4m0 0L7 9m5-5 5 5M4 15v5h16v-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-medium">
          {disabled || busy
            ? '正在处理…'
            : multiple
              ? '拖入多张图片，或点击选择'
              : '拖入图片，或点击选择'}
        </span>
        <span className="text-xs text-muted">{hint ?? 'JPG / PNG / WebP，单张不超过 20 MB'}</span>
      </button>
      <input
        ref={input}
        type="file"
        aria-label="上传图片"
        accept={ACCEPTED_TYPES.join(',')}
        multiple={multiple}
        disabled={disabled || busy}
        hidden
        onChange={(event) => {
          void accept(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
