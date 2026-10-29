import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ListParams } from '@/shared/api/pagination'
import type { AuthorUpsert } from '../domain/author'
import { authorsApi } from '../infrastructure/authors.api'

/**
 * Application layer — query keys and use-case hooks. Components
 * consume these; they never touch the api object or cache keys.
 */

export const authorKeys = {
  all: ['authors'] as const,
  lists: () => [...authorKeys.all, 'list'] as const,
  list: (params: ListParams) => [...authorKeys.lists(), params] as const,
  details: () => [...authorKeys.all, 'detail'] as const,
  detail: (authorId: number) => [...authorKeys.details(), authorId] as const,
}

export function useAuthorsList(params: ListParams) {
  return useQuery({
    queryKey: authorKeys.list(params),
    queryFn: () => authorsApi.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useAuthor(authorId: number) {
  return useQuery({
    queryKey: authorKeys.detail(authorId),
    queryFn: () => authorsApi.get(authorId),
  })
}

export function useCreateAuthor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AuthorUpsert) => authorsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authorKeys.lists() }),
  })
}

export function useUpdateAuthor(authorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<AuthorUpsert>) => authorsApi.update(authorId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authorKeys.all }),
  })
}

export function useDeleteAuthor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (authorId: number) => authorsApi.remove(authorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authorKeys.lists() }),
  })
}
