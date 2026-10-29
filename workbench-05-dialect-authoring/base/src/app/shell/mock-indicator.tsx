import { useMockStore } from '@/shared/stores/mock.store'
import { cn } from '@/lib/utils'

/**
 * Runtime pill for MSW mock mode (ported from mock-mode-workshop's
 * MockToggle). Renders nothing in builds where mocking was never
 * bootstrapped — the store's `isAvailable` is compile-time false
 * there and the whole subtree tree-shakes out.
 */
export function MockIndicator() {
  const { isAvailable, isEnabled, toggle } = useMockStore()

  if (!isAvailable) return null

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={isEnabled}
      className="flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', isEnabled ? 'bg-success' : 'bg-muted-foreground')}
      />
      Mock mode {isEnabled ? 'on' : 'off'}
    </button>
  )
}
