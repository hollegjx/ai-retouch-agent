import { useState } from 'react'
import { RATIO_LABELS } from '@/lib/runs'
import type { GenerateInput, Ratio } from '@/types/runs'
import { buttonClass } from '@/components/ui/buttonStyles'

export default function GenerateForm({
  onSubmit,
  pending,
  defaultPrompt = '',
}: {
  onSubmit: (input: GenerateInput) => void
  pending: boolean
  defaultPrompt?: string
}) {
  const [prompt, setPrompt] = useState(defaultPrompt)
  const [ratio, setRatio] = useState<Ratio>('1:1')
  const [count, setCount] = useState(4)
  const [negative, setNegative] = useState('')
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!prompt.trim() || pending) return
        onSubmit({
          prompt: prompt.trim(),
          ratio,
          count,
          negative_prompt: negative.trim() || undefined,
        })
      }}
    >
      <label className="block">
        <span className="form-label">画面描述</span>
        <textarea
          className="form-field min-h-36 resize-y text-[15px] leading-relaxed"
          rows={4}
          value={prompt}
          maxLength={1500}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="例如：白色陶瓷马克杯放在浅木色桌面，晨光从左侧照入。"
          required
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label>
          <span className="form-label">画面比例</span>
          <select
            className="form-field"
            value={ratio}
            onChange={(event) => setRatio(event.target.value as Ratio)}
          >
            {Object.entries(RATIO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="form-label">生成数量</span>
          <select
            className="form-field"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          >
            {[1, 2, 4, 6].map((value) => (
              <option key={value} value={value}>
                {value} 张
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="text-muted text-[13px]">
        <summary className="cursor-pointer hover:text-ink">排除内容（可选）</summary>
        <input
          className="form-field mt-2"
          aria-label="排除内容"
          value={negative}
          maxLength={1500}
          onChange={(event) => setNegative(event.target.value)}
          placeholder="不希望出现的内容，例如文字、水印"
        />
      </details>
      <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
        <p className="text-[13px] text-muted">生成后选择一张进入编辑</p>
        <button
          type="submit"
          className={buttonClass({ variant: 'solid' })}
          disabled={!prompt.trim() || pending}
        >
          {pending ? '提交中…' : '生成图片'}
        </button>
      </div>
    </form>
  )
}
