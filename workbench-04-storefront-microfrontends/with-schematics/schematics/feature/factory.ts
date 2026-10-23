import { find, replaceContent, scaffold } from '@pbuilder/sdk/commons';
import type { Input } from './schema.generated.ts';

const FIRST_WEB_PORT = 3101;
const SERVICE_PORT_OFFSET = 1000;
const PRINT_WIDTH = 80;

const MF = 'apps/shell/src/mf.ts';
const SHELL_APP = 'apps/shell/src/App.tsx';
const GATEWAY_MODULE = 'apps/gateway/src/app/app.module.ts';
const GATEWAY_PACKAGE = 'apps/gateway/package.json';
const GATEWAY_TSCONFIG = 'apps/gateway/tsconfig.app.json';

// Every edit below is a pure insertion shaped like Prettier's output, so the
// files the schematic touches show only the new lines in a diff.

async function read(path: string): Promise<string> {
  const content = await find(path).read();
  if (content === undefined) {
    throw new Error(`feature: ${path} not found; run this schematic at the storefront root`);
  }
  return content;
}

function words(name: string): string[] {
  return name.split('-');
}

function nextWebPort(mf: string): number {
  const ports = [...mf.matchAll(/localhost:(\d+)\/remoteEntry\.js/g)].map((m) => Number(m[1]));
  return ports.length ? Math.max(...ports) + 1 : FIRST_WEB_PORT;
}

/** Index of the bracket that closes the one at `open`, skipping string contents. */
function matchingBracket(text: string, open: number): number {
  const pairs: Record<string, string> = { '[': ']', '{': '}', '(': ')' };
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === "'" || c === '"' || c === '`') quote = c;
    else if (pairs[c]) stack.push(pairs[c]);
    else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return i;
    }
  }
  throw new Error('feature: unbalanced brackets');
}

/**
 * Appends `block` (already indented) as the last element of the multi-line array or
 * object that opens right after `anchor`. JSON gets the separator before the block;
 * TypeScript, whose Prettier output has trailing commas, gets it after.
 */
function appendElement(text: string, anchor: RegExp, block: string, style: 'json' | 'ts'): string {
  const match = anchor.exec(text);
  if (!match) throw new Error(`feature: ${anchor} not found`);
  const open = match.index + match[0].length - 1;
  const close = matchingBracket(text, open);
  let end = close - 1;
  while (/\s/.test(text[end])) end--;
  const empty = end === open;
  if (style === 'json') {
    return `${text.slice(0, end + 1)}${empty ? '' : ','}\n${block}${text.slice(end + 1)}`;
  }
  const separator = empty || text[end] === ',' ? '' : ',';
  return `${text.slice(0, end + 1)}${separator}\n${block},${text.slice(end + 1)}`;
}

function indentOfElements(text: string, anchor: RegExp): string {
  const match = anchor.exec(text);
  if (!match) throw new Error(`feature: ${anchor} not found`);
  return /\n([ \t]*)\S/.exec(text.slice(match.index + match[0].length))?.[1] ?? '  ';
}

function indent(block: string, prefix: string): string {
  return block
    .split('\n')
    .map((line) => (line ? prefix + line : line))
    .join('\n');
}

function importStatement(names: string[], from: string): string {
  const single = `import { ${names.join(', ')} } from '${from}';`;
  return single.length <= PRINT_WIDTH
    ? single
    : `import {\n${names.map((n) => `  ${n},`).join('\n')}\n} from '${from}';`;
}

/** Inserts a whole statement after the last line of the statement that `after` matches. */
function insertAfterStatement(text: string, after: RegExp, statement: string): string {
  const matches = [...text.matchAll(new RegExp(after.source, `${after.flags.replace('g', '')}g`))];
  const last = matches[matches.length - 1];
  if (!last) throw new Error(`feature: ${after} not found`);
  const lineEnd = text.indexOf('\n', last.index! + last[0].length);
  return `${text.slice(0, lineEnd + 1)}${statement}\n${text.slice(lineEnd + 1)}`;
}

/** Inserts `statement` among the single-line relative imports, keeping them sorted by path. */
function insertRelativeImport(text: string, statement: string, from: string): string {
  const relative = [...text.matchAll(/^import .* from '(\.\/[^']+)';$/gm)];
  const before = relative.find((m) => m[1] > from);
  if (before) return `${text.slice(0, before.index)}${statement}\n${text.slice(before.index)}`;
  return insertAfterStatement(text, /^import .* from '\.\/[^']+';$/m, statement);
}

function insertAfterLastLine(content: string, marker: RegExp, insertion: string): string {
  const lines = content.split('\n');
  const index = lines.findLastIndex((line) => marker.test(line));
  if (index === -1) throw new Error(`feature: no line matches ${marker} to insert after`);
  lines.splice(index + 1, 0, insertion);
  return lines.join('\n');
}

export default async (input: Input) => {
  const { name } = input;
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
    throw new Error(`feature: name must be kebab-case, got "${name}"`);
  }

  const mf = await read(MF);
  if (mf.includes(`alias: '${name}'`)) {
    throw new Error(`feature: "${name}" is already registered in ${MF}`);
  }
  const shellApp = await read(SHELL_APP);
  const gatewayModule = await read(GATEWAY_MODULE);
  const gatewayPackage = await read(GATEWAY_PACKAGE);
  const gatewayTsconfig = await read(GATEWAY_TSCONFIG);
  const rootPackage = await read('package.json');
  const rootTsconfig = await read('tsconfig.json');

  const className = words(name).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  const constName = words(name).join('_').toUpperCase();
  const webPort = input.webPort ?? nextWebPort(mf);
  const servicePort = input.servicePort ?? webPort + SERVICE_PORT_OFFSET;
  const options = {
    name,
    className,
    constName,
    propertyName: className[0].toLowerCase() + className.slice(1),
    federationName: words(name).join('_'),
    title: words(name).map((w) => w[0].toUpperCase() + w.slice(1)).join(' '),
    webPort: String(webPort),
    servicePort: String(servicePort),
    // Line breaks of `Number(<port>)` in the service's main.ts, as Prettier prints them.
    servicePortArgument:
      `    process.env.${constName}_SERVICE_PORT ?? ${constName}_SERVICE_DEFAULT_PORT,`.length <= PRINT_WIDTH
        ? `    process.env.${constName}_SERVICE_PORT ?? ${constName}_SERVICE_DEFAULT_PORT,`
        : `    process.env.${constName}_SERVICE_PORT ??\n      ${constName}_SERVICE_DEFAULT_PORT,`,
  };
  const contract = `@storefront/${name}-contract`;

  scaffold({ from: 'files/web', to: 'apps', options });
  scaffold({ from: 'files/service', to: 'apps', options });
  scaffold({ from: 'files/contract', to: 'packages', options });
  scaffold({ from: 'files/gateway', to: 'apps/gateway/src/app', options });

  const providers = /const PROVIDERS[^=]*= \[/;
  replaceContent(
    MF,
    appendElement(
      mf,
      providers,
      indent(
        [
          '{',
          `  alias: '${name}',`,
          `  name: '${options.federationName}',`,
          `  entry: 'http://localhost:${webPort}/remoteEntry.js',`,
          '}',
        ].join('\n'),
        indentOfElements(mf, providers),
      ),
      'ts',
    ),
  );

  let app = insertAfterLastLine(shellApp, /= lazyProvider\(/, `const ${className} = lazyProvider('${name}', 'App');`);
  app = insertAfterLastLine(
    app,
    /<\/ProviderBoundary>/,
    [`      <ProviderBoundary name="${name}">`, `        <${className} />`, '      </ProviderBoundary>'].join('\n'),
  );
  replaceContent(SHELL_APP, app);

  let module = insertAfterStatement(
    gatewayModule,
    /^\} from '@storefront\/[^']+';$|^import .* from '@storefront\/[^']+';$/m,
    importStatement([`${constName}_SERVICE`, `${constName}_SERVICE_DEFAULT_PORT`], contract),
  );
  module = insertRelativeImport(
    module,
    importStatement([`${className}Controller`], `./${name}.controller`),
    `./${name}.controller`,
  );
  const register = /ClientsModule\.register\(\[/;
  const clientIndent = indentOfElements(module, register);
  const port = `process.env.${constName}_SERVICE_PORT ?? ${constName}_SERVICE_DEFAULT_PORT`;
  const portOnOneLine = `${clientIndent}    port: Number(${port}),`.length <= PRINT_WIDTH;
  const portArgument =
    `${clientIndent}      ${port},`.length <= PRINT_WIDTH
      ? [`      ${port},`]
      : [`      process.env.${constName}_SERVICE_PORT ??`, `        ${constName}_SERVICE_DEFAULT_PORT,`];
  module = appendElement(
    module,
    register,
    indent(
      [
        '{',
        `  name: ${constName}_SERVICE,`,
        '  transport: Transport.TCP,',
        '  options: {',
        `    host: process.env.${constName}_SERVICE_HOST ?? 'localhost',`,
        ...(portOnOneLine ? [`    port: Number(${port}),`] : ['    port: Number(', ...portArgument, '    ),']),
        '  },',
        '}',
      ].join('\n'),
      clientIndent,
    ),
    'ts',
  );
  const controllers = /controllers: \[/;
  module = appendElement(module, controllers, `${indentOfElements(module, controllers)}${className}Controller`, 'ts');
  replaceContent(GATEWAY_MODULE, module);

  const dependencies = /"dependencies": \{/;
  replaceContent(
    GATEWAY_PACKAGE,
    appendElement(gatewayPackage, dependencies, `${indentOfElements(gatewayPackage, dependencies)}"${contract}": "*"`, 'json'),
  );

  const references = /"references": \[/;
  const reference = (path: string, text: string) =>
    indent(['{', `  "path": "${path}"`, '}'].join('\n'), indentOfElements(text, references));
  replaceContent(
    GATEWAY_TSCONFIG,
    appendElement(gatewayTsconfig, references, reference(`../../packages/${name}-contract/tsconfig.lib.json`, gatewayTsconfig), 'json'),
  );

  const workspaces = /"workspaces": \[/;
  if (!rootPackage.includes(`"apps/${name}-service"`) && !rootPackage.includes('"apps/*"')) {
    replaceContent(
      'package.json',
      appendElement(rootPackage, workspaces, `${indentOfElements(rootPackage, workspaces)}"apps/${name}-service"`, 'json'),
    );
  }

  let tsconfig = appendElement(rootTsconfig, references, reference(`./packages/${name}-contract`, rootTsconfig), 'json');
  tsconfig = appendElement(tsconfig, references, reference(`./apps/${name}-service`, tsconfig), 'json');
  replaceContent('tsconfig.json', tsconfig);
};
