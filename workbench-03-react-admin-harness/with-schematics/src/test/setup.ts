import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import '@mocks/setup-test-mocking'

// Section tests drive the REAL router + query client, so an assertion
// can legitimately wait on a navigation AND a refetch. Testing
// Library's 1s default for findBy*/waitFor is tight enough that a
// slow worker (21 test files run in parallel) turns those into flakes.
// A longer ceiling never weakens an assertion — a real failure still
// fails, it just takes longer to give up.
configure({ asyncUtilTimeout: 5000 })

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
