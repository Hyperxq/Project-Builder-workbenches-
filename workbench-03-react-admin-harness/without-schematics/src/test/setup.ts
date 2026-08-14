import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import '@mocks/setup-test-mocking'
import { useRoleStore } from '@/shared/stores/role.store'

// The role store is module-level Zustand state: it outlives an individual
// test. Reset it globally so a Viewer-mode case can never leak into the
// next test — the app-store counterpart of `mocks/setup-test-mocking.ts`'s
// `afterEach`, which reseeds every mock domain.
afterEach(() => {
  useRoleStore.setState({ role: 'admin' })
})

// jsdom lacks several browser APIs that Radix primitives and sonner
// rely on. Stub the minimum so component tests can drive real menus,
// dialogs and toasts.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Element.prototype.scrollIntoView ??= () => {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
