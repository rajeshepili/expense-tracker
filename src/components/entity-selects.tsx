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
      <SelectTrigger id={id} className="w-full">
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

export function PaymentMethodSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Optional',
}: {
  id: string
  value: string
  onValueChange: (id: string) => void
  options: NamedOption[]
  placeholder?: string
}) {
  return (
    <Select
      value={value || NONE}
      onValueChange={(next) => onValueChange(next === NONE ? '' : next)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={NONE}>None</SelectItem>
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
