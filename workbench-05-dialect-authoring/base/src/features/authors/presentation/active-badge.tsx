import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant="outline" className="gap-1.5 text-xs font-normal">
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', active ? 'bg-success' : 'bg-muted-foreground')}
      />
      {active ? 'Active' : 'Inactive'}
    </Badge>
  )
}
