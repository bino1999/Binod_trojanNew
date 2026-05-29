import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const Checkbox = forwardRef(({ className, checked, onCheckedChange, id, disabled, ...props }, ref) => (
  <button
    ref={ref}
    id={id}
    type="button"
    role="checkbox"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      'h-4 w-4 shrink-0 rounded border border-primary shadow transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'bg-primary text-primary-foreground' : 'bg-background',
      className,
    )}
    {...props}
  >
    {checked && <Check className="h-3 w-3 stroke-[3]" />}
  </button>
))
Checkbox.displayName = 'Checkbox'

export { Checkbox }
