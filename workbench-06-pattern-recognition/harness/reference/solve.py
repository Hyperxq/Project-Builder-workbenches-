"""Reference solution of one task, applied to a repository in place.

Usage: python3 -I solve.py <repo> <task-id>
Used only to validate the checker: applied in sequence to the base, every task's
hidden tests and gates must pass. It is never shown to an agent.
"""

import sys
from pathlib import Path

repo, task = Path(sys.argv[1]), sys.argv[2]


def edit(path, anchor, text, before=False):
    file = repo / path
    source = file.read_text()
    assert source.count(anchor) == 1, f"{path}: anchor not unique: {anchor!r}"
    file.write_text(source.replace(anchor, text + anchor if before else anchor + text))


OPTIONAL_TEXT = """
        {{...register('{key}', {{
            setValueAs: (value) =>
              typeof value === 'string' && value.trim() === '' ? undefined : value,
          }})}}"""
OPTIONAL_NUMBER = """
        type="number"
        {{...register('{key}', {{
            setValueAs: (value) => (value === '' || value === undefined ? undefined : Number(value)),
          }})}}"""


def field(key, label, schema, number=False):
    edit("src/features/authors/domain/author.ts", "  active: z.boolean(),\n})", f"  {key}: {schema},\n", before=True)
    register = (OPTIONAL_NUMBER if number else OPTIONAL_TEXT).format(key=key)
    edit(
        "src/features/authors/presentation/author-form.tsx",
        "      <Controller",
        f"""      <div className="space-y-2">
        <Label htmlFor="{key}">
          {label} <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="{key}"
          aria-invalid={{errors.{key} !== undefined}}{register}
        />
        {{errors.{key} && (
          <p role="alert" className="text-xs text-destructive">
            {{errors.{key}.message}}
          </p>
        )}}
      </div>

""",
        before=True,
    )
    for source in ("body", "merged"):
        value = f"{source}.{key}" if number else f"{source}.{key}?.trim() || undefined"
        edit("mocks/domains/authors.mock.ts", f"        country: {source}.country?.trim() || undefined,\n", f"        {key}: {value},\n")
    edit(
        "src/features/authors/presentation/author-detail-page.tsx",
        "              <div>\n                <dt className=\"text-xs text-muted-foreground\">Status</dt>",
        f"""              <div>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-sm">{{author.{key} ?? '—'}}</dd>
              </div>
""",
        before=True,
    )


def page(title, path, icon, body):
    name = title.replace(" ", "")
    (repo / f"src/routes{path}.tsx").write_text(
        f"""import {{ createFileRoute }} from '@tanstack/react-router'

export const Route = createFileRoute('{path}')({{
  component: {name}Page,
}})

function {name}Page() {{
  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}}
"""
    )
    sidebar = repo / "src/app/shell/app-sidebar.tsx"
    source = sidebar.read_text()
    start = source.index("import {", source.index("from '@tanstack/react-router'"))
    end = source.index("} from 'lucide-react'")
    names = sorted({n.strip() for n in source[start + len("import {"):end].split(",")} | {icon})
    source = source[:start] + "import { " + ", ".join(names) + " " + source[end:]
    source = source.replace("\n]\n\nexport function AppSidebar", f"\n  {{ to: '{path}', label: '{title}', icon: {icon} }},\n]\n\nexport function AppSidebar", 1)
    sidebar.write_text(source)


def authors_count():
    edit("src/routes/index.tsx", "import { Card,", "import { useAuthorsList } from '@/features/authors/application/use-authors'\n", before=True)
    edit("src/routes/index.tsx", "function OverviewPage() {\n", "  const { data } = useAuthorsList({ page: 1, pageSize: 1, q: '' })\n")
    edit(
        "src/routes/index.tsx",
        "              <CardDescription>Reference module — list, create, edit and remove authors.</CardDescription>\n",
        "              {data && <p className=\"text-xs text-muted-foreground\">{data.total} authors</p>}\n",
    )


def app_version():
    edit("src/app/shell/app-sidebar.tsx", "import { MockIndicator } from './mock-indicator'\n", "import { version } from '../../../package.json'\n")
    edit(
        "src/app/shell/app-sidebar.tsx",
        "        <MockIndicator />\n",
        "        <p className=\"mt-2 text-xs text-muted-foreground\">v{version}</p>\n",
    )


def copy_email():
    edit(
        "src/features/authors/presentation/author-detail-page.tsx",
        "                <dd className=\"mt-0.5 text-sm\">{author.email}</dd>\n",
        """                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void navigator.clipboard.writeText(author.email).then(() => toast.success('Email copied'))
                  }
                >
                  Copy email
                </Button>
""",
    )


SOLUTIONS = {
    "T01": lambda: field("website", "Website", "z.url('Must be a valid URL').optional()"),
    "T02": lambda: page("Help", "/help", "CircleHelp", "Questions about the admin? Write to support@example.com."),
    "T03": authors_count,
    "T04": lambda: field(
        "birthYear",
        "Birth year",
        "z.number().int('Must be a year from 1000 to 2100').min(1000, 'Must be a year from 1000 to 2100').max(2100, 'Must be a year from 1000 to 2100').optional()",
        number=True,
    ),
    "T05": lambda: page("About", "/about", "Info", "This admin manages the authors of the catalogue."),
    "T06": lambda: field("bio", "Bio", "z.string().trim().max(500, 'Must be at most 500 characters').optional()"),
    "T07": app_version,
    "T08": lambda: page("Changelog", "/changelog", "History", "Version 1.4.0 adds author profiles."),
    "T09": lambda: field("penName", "Pen name", "z.string().trim().min(1).optional()"),
    "T10": copy_email,
}

SOLUTIONS[task]()
