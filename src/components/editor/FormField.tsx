interface FormFieldProps {
  label: string
  id: string
  value: string
  onChange?: (val: string) => void
  type?: 'text' | 'textarea' | 'select'
  options?: { value: string; label: string }[]
  readOnly?: boolean
  placeholder?: string
  required?: boolean
  error?: string
  confidence?: 'very low' | 'low' | 'high'
}

const inputBase =
  'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow'

const readOnlyClass =
  'w-full rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-500'

export default function FormField({
  label,
  id,
  value,
  onChange,
  type = 'text',
  options = [],
  readOnly = false,
  placeholder,
  required,
  error,
  confidence,
}: FormFieldProps) {
  const isEmpty = required && !value.trim()

  // Border color used for text/textarea on the element itself, and for the select wrapper div
  const borderColor = error
    ? 'border-red-400'
    : isEmpty
    ? 'border-amber-400'
    : confidence === 'very low'
    ? 'border-orange-400'
    : confidence === 'low'
    ? 'border-amber-400'
    : 'border-gray-200'

  // Focus ring color for text/textarea
  const focusRing = error
    ? 'focus:ring-red-400'
    : isEmpty
    ? 'focus:ring-amber-400'
    : confidence === 'very low'
    ? 'focus:ring-orange-400'
    : confidence === 'low'
    ? 'focus:ring-amber-400'
    : 'focus:ring-indigo-500'

  // focus-within ring for the select wrapper div
  const focusWithinRing = error
    ? 'focus-within:ring-2 focus-within:ring-red-400 focus-within:border-transparent'
    : isEmpty
    ? 'focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-transparent'
    : confidence === 'very low'
    ? 'focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-transparent'
    : confidence === 'low'
    ? 'focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-transparent'
    : 'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent'

  const bgClass = isEmpty ? 'bg-amber-50' : 'bg-white'

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {readOnly ? (
        <div className={readOnlyClass}>{value || <span className="text-gray-300">—</span>}</div>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${inputBase} ${borderColor} ${focusRing} ${bgClass} resize-none`}
        />
      ) : type === 'select' ? (
        // Border and bg go on the wrapper div — CSS on div is always reliable,
        // unlike <select> where browsers (especially iOS Safari) override styling.
        <div className={`relative rounded-lg border ${borderColor} ${bgClass} ${focusWithinRing} transition-shadow`}>
          <select
            id={id}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            className="w-full bg-transparent px-3 py-2 text-sm text-gray-900 focus:outline-none appearance-none pr-8 rounded-lg"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 8l4 4 4-4" />
            </svg>
          </div>
        </div>
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`${inputBase} ${borderColor} ${focusRing} ${bgClass}`}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {!error && confidence === 'very low' && (
        <p className="mt-1 text-xs text-orange-500">confidence: very low</p>
      )}
      {!error && confidence === 'low' && (
        <p className="mt-1 text-xs text-amber-500">confidence: low</p>
      )}
    </div>
  )
}
