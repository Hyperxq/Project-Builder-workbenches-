import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { routeTree } from '../routeTree.gen'

/**
 * SECTION-TIER test harness: renders the REAL app (real routes,
 * real providers) at a given path, with MSW's node server already
 * listening via the global setup. Tests drive it like a user.
 */
export async function renderApp(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  await router.load()

  return { ...result, router }
}
