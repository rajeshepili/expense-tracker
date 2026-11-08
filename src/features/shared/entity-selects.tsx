import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

type NamedOption = { id: string; name: string }

const UNSET = '__unset__'
const NONE = '__none__'

export function CategorySelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Choose category',
}: {
  id: string
  value: string
  onValueChange: (id: string) => void
  options: NamedOption[]
  placeholder?: string
}) {
  return (
    <Select
      value={value || UNSET}
      onValueChange={(next) => onValueChange(next === UNSET ? '' : next)}
    >
      <SelectTrigger id={id} className="min-h-11 w-full md:min-h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={UNSET} disabled>
            {placeholder}
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function AccountSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Optional',
  allowNone = true,
}: {
  id: string
  value: string
  onValueChange: (id: string) => void
  options: NamedOption[]
  placeholder?: string
  allowNone?: boolean
}) {
  const emptyValue = allowNone ? NONE : UNSET
  return (
    <Select
      value={value || emptyValue}
      onValueChange={(next) =>
        onValueChange(next === NONE || next === UNSET ? '' : next)
      }
    >
      <SelectTrigger id={id} className="min-h-11 w-full md:min-h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {allowNone ? (
            <SelectItem value={NONE}>None</SelectItem>
          ) : (
            <SelectItem value={UNSET} disabled>
              {placeholder}
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
