import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Author, AuthorUpsert } from '../domain/author'
import { authorUpsertSchema } from '../domain/author'

interface AuthorFormProps {
  /** When set, the form edits this author and its key becomes read-only. */
  author?: Author
  submitLabel: string
  isPending: boolean
  /** Server-side error (e.g. uniqueness conflict) shown above the actions. */
  serverError?: string
  onSubmit: (values: AuthorUpsert) => void
  onCancel: () => void
}

export function AuthorForm({
  author,
  submitLabel,
  isPending,
  serverError,
  onSubmit,
  onCancel,
}: AuthorFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthorUpsert>({
    resolver: zodResolver(authorUpsertSchema),
    defaultValues: author ?? { active: true },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-lg space-y-5">
      <div className="space-y-2">
        <Label htmlFor="authorId">Author ID</Label>
        <Input
          id="authorId"
          type="number"
          disabled={author !== undefined}
          aria-invalid={errors.authorId !== undefined}
          {...register('authorId', { valueAsNumber: true })}
        />
        {errors.authorId && (
          <p role="alert" className="text-xs text-destructive">
            {errors.authorId.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          aria-invalid={errors.fullName !== undefined}
          {...register('fullName')}
        />
        {errors.fullName && (
          <p role="alert" className="text-xs text-destructive">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" aria-invalid={errors.email !== undefined} {...register('email')} />
        {errors.email && (
          <p role="alert" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">
          Country <span className="text-muted-foreground">(optional)</span>
        </Label>
        {/* Empty text input maps to undefined so the optional field
            skips min-length validation. */}
        <Input
          id="country"
          aria-invalid={errors.country !== undefined}
          {...register('country', {
            setValueAs: (value) =>
              typeof value === 'string' && value.trim() === '' ? undefined : value,
          })}
        />
        {errors.country && (
          <p role="alert" className="text-xs text-destructive">
            {errors.country.message}
          </p>
        )}
      </div>

      <Controller
        control={control}
        name="active"
        render={({ field }) => (
          <div className="flex items-center gap-3">
            <Switch id="active" checked={field.value ?? true} onCheckedChange={field.onChange} />
            <Label htmlFor="active">Active</Label>
          </div>
        )}
      />

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
