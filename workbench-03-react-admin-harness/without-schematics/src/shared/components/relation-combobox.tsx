import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Shared relation picker: an async combobox over another entity's list
 * endpoint. Used by any feature whose form holds a foreign key
 * (Review → Book today, Invoice → Supplier later).
 *
 * It is deliberately PRESENTATIONAL — it never fetches. The owning
 * feature drives `query`/`options` through the related feature's
 * application hook, which keeps the dependency direction legal
 * (a feature may use another feature's application/infrastructure
 * exports, never its presentation).
 *
 * Free typing is allowed on purpose: `allowFreeText` offers the raw
 * query as a selectable value so an unknown key can be submitted and
 * then FAIL validation, instead of being silently unselectable.
 */

export interface RelationOption {
  /** The value stored in the form (the related entity's unique key). */
  key: string
  /** Human label, e.g. "title (isbn)". */
  label: string
}

interface RelationComboboxProps {
  /** Id of the trigger button — pair it with a <Label htmlFor>. */
  id: string
  /** Currently selected key, or undefined when nothing is picked. */
  value?: string
  /** Label for the current value when it isn't in `options` (e.g. on edit). */
  selectedLabel?: string
  options: RelationOption[]
  query: string
  onQueryChange: (query: string) => void
  onChange: (value: string) => void
  /** Accessible name of the search field, e.g. "Search books". */
  searchLabel: string
  isLoading?: boolean
  placeholder?: string
  emptyMessage?: string
  invalid?: boolean
  disabled?: boolean
  /** Offer `Use "<query>"` when the query matches no option. Default true. */
  allowFreeText?: boolean
}

export function RelationCombobox({
  id,
  value,
  selectedLabel,
  options,
  query,
  onQueryChange,
  onChange,
  searchLabel,
  isLoading = false,
  placeholder = 'Select…',
  emptyMessage = 'No matches',
  invalid = false,
  disabled = false,
  allowFreeText = true,
}: RelationComboboxProps) {
  const [open, setOpen] = useState(false)

  const trimmed = query.trim()
  const showFreeText =
    allowFreeText && trimmed !== '' && !options.some((option) => option.key === trimmed)

  function select(next: string) {
    onChange(next)
    setOpen(false)
  }

  const triggerLabel =
    selectedLabel ?? options.find((option) => option.key === value)?.label ?? value ?? placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            value === undefined && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        {/* Search runs on the server, so cmdk's own filtering is off.
            `label` feeds cmdk's own sr-only <label>, which it wires to the
            input via aria-labelledby — that takes precedence over an
            aria-label here, so this is what actually names the field. */}
        <Command shouldFilter={false} label={searchLabel}>
          <CommandInput
            value={query}
            onValueChange={onQueryChange}
            placeholder={`${searchLabel}…`}
          />
          <CommandList>
            {isLoading && options.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
            ) : (
              !showFreeText && <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}

            {options.map((option) => (
              <CommandItem
                key={option.key}
                value={option.key}
                data-checked={option.key === value}
                onSelect={() => select(option.key)}
              >
                <Check
                  aria-hidden
                  className={cn('size-4', option.key === value ? 'opacity-100' : 'opacity-0')}
                />
                {option.label}
              </CommandItem>
            ))}

            {showFreeText && (
              <CommandItem value={`free-text:${trimmed}`} onSelect={() => select(trimmed)}>
                Use “{trimmed}”
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
