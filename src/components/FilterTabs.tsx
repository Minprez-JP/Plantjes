import { FILTERS } from '../lib/constants'
import type { Filter } from '../types'

interface FilterTabsProps {
  value: Filter
  onChange: (filter: Filter) => void
}

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <div className="filter-tabs" role="group" aria-label="Filter plants">
      {FILTERS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          className={value === option ? 'filter-tab is-active' : 'filter-tab'}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
