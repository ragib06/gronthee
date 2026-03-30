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
}

const inputClass =
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
}: FormFieldProps) {
  const borderClass = error
    ? 'border-red-400 focus:ring-red-400'
    : 'border-gray-200 focus:ring-indigo-500'

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
          className={`${inputClass} ${borderClass} resize-none`}
        />
      ) : type === 'select' ? (
        <select
          id={id}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          className={`${inputClass} ${borderClass}`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} ${borderClass}`}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
