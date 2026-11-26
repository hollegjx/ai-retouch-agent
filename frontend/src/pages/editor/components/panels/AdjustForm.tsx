import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { useEditorUi } from '@/stores/editorUi'
import { SliderField } from './SliderField'
import { Section } from './Section'

const ADJUST_FIELDS: { key: string; label: string; min?: number }[] = [
  { key: 'brightness', label: '亮度' },
  { key: 'contrast', label: '对比度' },
  { key: 'highlights', label: '高光' },
  { key: 'shadows', label: '阴影' },
  { key: 'temperature', label: '色温' },
  { key: 'tint', label: '色调' },
  { key: 'saturation', label: '饱和度' },
  { key: 'vibrance', label: '自然饱和度' },
  { key: 'sharpness', label: '锐化' },
  { key: 'clarity', label: '清晰度' },
  { key: 'vignette', label: '晕影', min: 0 },
]

export function AdjustForm({
  disabled,
  onApply,
}: {
  disabled: boolean
  onApply: (params: Record<string, number>) => void
}) {
  const [values, setValues] = useState<Record<string, number>>({})
  const setAdjustPreview = useEditorUi((state) => state.setAdjustPreview)
  const touched = Object.keys(values).length > 0

  useEffect(() => () => setAdjustPreview(null), [setAdjustPreview])

  const clear = () => {
    setValues({})
    setAdjustPreview(null)
  }

  return (
    <Section title="调色">
      <p className="text-faint mb-3 text-xs leading-relaxed">
        拖动即在画布预览，锐化与清晰度需应用后可见。点应用写入新版本，可撤销。
      </p>
      <div className="space-y-3">
        {ADJUST_FIELDS.map((field) => (
          <SliderField
            key={field.key}
            label={field.label}
            value={values[field.key] ?? 0}
            origin={0}
            min={field.min ?? -1}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            disabled={disabled}
            onInput={(value) => setAdjustPreview({ ...values, [field.key]: value })}
            onCommit={(value) => {
              const next = { ...values, [field.key]: value }
              setValues(next)
              setAdjustPreview(next)
            }}
          />
        ))}
        <div className="flex gap-2">
          <Button variant="outline" block disabled={disabled || !touched} onClick={clear}>
            重置
          </Button>
          <Button
            variant="solid"
            block
            disabled={disabled || !touched}
            title={touched ? '写入当前调色，可撤销' : '先拖动滑杆再应用'}
            onClick={() => {
              onApply(values)
              clear()
            }}
          >
            应用
          </Button>
        </div>
      </div>
    </Section>
  )
}
