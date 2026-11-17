import { ChevronDown } from 'lucide-react'

export interface FilterSelectOption<Value extends string = string> {
  value: Value
  label: string
}

interface FilterSelectProps<Value extends string> {
  label: string
  value: Value
  options: readonly FilterSelectOption<Value>[]
  onChange: (value: Value) => void
}

/** A compact native select used for the collection's location and care filters. */
export function FilterSelect<Value extends string>({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps<Value>) {
  return (
    <div className="filter-select">
      <select
        value={value}
        aria-label={label}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value)
          if (next) onChange(next.value)
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </div>
  )
}
