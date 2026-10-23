import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runFactoryForTest } from '@pbuilder/sdk/testing';
import factory from './factory.ts';

// The arm root this schematic ships in is the workspace it generates into.
const STOREFRONT = join(import.meta.dir, '../..');
const WIRED = [
  'apps/shell/src/mf.ts',
  'apps/shell/src/App.tsx',
  'apps/gateway/src/app/app.module.ts',
  'apps/gateway/package.json',
  'apps/gateway/tsconfig.app.json',
  'package.json',
  'tsconfig.json',
  'README.md',
];
const seed = Object.fromEntries(
  WIRED.map((path) => [path, readFileSync(join(STOREFRONT, path), 'utf8')]),
);

async function run(input: Parameters<typeof factory>[0]) {
  return runFactoryForTest(factory, input, { seed, packageDir: import.meta.dir });
}

describe('feature schematic', () => {
  // runFactoryForTest keeps scaffolded paths and contents unrendered, so these
  // assert the token form; the rendered output is checked with a real execute.
  it('generates the three projects and the gateway controller', async () => {
    const result = await run({ name: 'product-reviews' });

    expect(result.error).toBeUndefined();
    const paths = [...result.tree.keys()];
    for (const path of [
      'apps/{= .name =}/rsbuild.config.ts',
      'apps/{= .name =}/src/App.tsx',
      'apps/{= .name =}/src/client.ts',
      'apps/{= .name =}-service/src/main.ts',
      'apps/{= .name =}-service/src/app/{= .name =}.controller.ts',
      'packages/{= .name =}-contract/src/{= .name =}.ts',
      'packages/{= .name =}-contract/package.json',
      'apps/gateway/src/app/{= .name =}.controller.ts',
      'apps/gateway/src/app/{= .name =}.controller.spec.ts',
    ]) {
      expect(paths).toContain(path);
    }
  });

  it('registers the provider in the shell on the next free port', async () => {
    const result = await run({ name: 'product-reviews' });

    const mf = result.tree.get('apps/shell/src/mf.ts') ?? '';
    expect(mf).toContain("alias: 'product-reviews'");
    expect(mf).toContain("name: 'product_reviews'");
    expect(mf).toContain('http://localhost:3104/remoteEntry.js');
    const app = result.tree.get('apps/shell/src/App.tsx') ?? '';
    expect(app).toContain("const ProductReviews = lazyProvider('product-reviews', 'App');");
    expect(app).toContain('<ProviderBoundary name="product-reviews">');
  });

  it('wires the service client and controller into the gateway', async () => {
    const result = await run({ name: 'product-reviews' });

    const module = result.tree.get('apps/gateway/src/app/app.module.ts') ?? '';
    expect(module).toContain('name: PRODUCT_REVIEWS_SERVICE');
    expect(module).toMatch(/process\.env\.PRODUCT_REVIEWS_SERVICE_PORT \?\?\s+PRODUCT_REVIEWS_SERVICE_DEFAULT_PORT/);
    expect(module).toMatch(/controllers: \[[^\]]*ProductReviewsController/);
    expect(module).toContain("from './product-reviews.controller'");
    expect(module).toContain("from '@storefront/product-reviews-contract'");
    const pkg = JSON.parse(result.tree.get('apps/gateway/package.json') ?? '{}');
    expect(pkg.dependencies['@storefront/product-reviews-contract']).toBe('*');
    const refs = JSON.parse(result.tree.get('apps/gateway/tsconfig.app.json') ?? '{}').references;
    expect(refs).toContainEqual({ path: '../../packages/product-reviews-contract/tsconfig.lib.json' });
  });

  it('adds the projects to the workspaces and the references', async () => {
    const result = await run({ name: 'product-reviews' });

    const root = JSON.parse(result.tree.get('package.json') ?? '{}');
    expect(root.workspaces).toContain('apps/product-reviews-service');
    const refs = JSON.parse(result.tree.get('tsconfig.json') ?? '{}').references;
    expect(refs).toContainEqual({ path: './packages/product-reviews-contract' });
    expect(refs).toContainEqual({ path: './apps/product-reviews-service' });
  });

  it('leaves the README to the agent', async () => {
    const result = await run({ name: 'product-reviews' });

    expect(result.tree.has('README.md')).toBe(false);
  });

  it('only inserts lines into the files it wires, keeping their formatting', async () => {
    const result = await run({ name: 'product-reviews' });

    for (const path of WIRED.filter((p) => p !== 'README.md')) {
      const before = seed[path].split('\n');
      const after = (result.tree.get(path) ?? '').split('\n');
      // Appending to a JSON or TS list adds a comma to the previous last element.
      const same = (a: string, b: string | undefined) => a === b || a === `${b},`;
      let next = 0;
      for (const line of after) if (same(line, before[next])) next++;
      expect({ path, keptInOrder: next }).toEqual({ path, keptInOrder: before.length });
    }
  });

  it('writes the shell and gateway entries the way Prettier formats the existing ones', async () => {
    const result = await run({ name: 'product-reviews' });

    expect(result.tree.get('apps/shell/src/mf.ts')).toContain(
      [
        '  {',
        "    alias: 'product-reviews',",
        "    name: 'product_reviews',",
        "    entry: 'http://localhost:3104/remoteEntry.js',",
        '  },',
        '];',
      ].join('\n'),
    );
    const module = result.tree.get('apps/gateway/src/app/app.module.ts') ?? '';
    expect(module).toContain(
      [
        'import {',
        '  PRODUCT_REVIEWS_SERVICE,',
        '  PRODUCT_REVIEWS_SERVICE_DEFAULT_PORT,',
        "} from '@storefront/product-reviews-contract';",
        "import { AppController } from './app.controller';",
      ].join('\n'),
    );
    expect(module).toContain(
      "import { OrdersController } from './orders.controller';\nimport { ProductReviewsController } from './product-reviews.controller';\nimport { RpcErrorFilter } from './rpc-error.filter';",
    );
    expect(module).toContain('    OrdersController,\n    ProductReviewsController,\n  ],');
    expect(module).toContain('        },\n      },\n    ]),');
    expect(module).toContain(
      '          port: Number(\n            process.env.PRODUCT_REVIEWS_SERVICE_PORT ??\n              PRODUCT_REVIEWS_SERVICE_DEFAULT_PORT,\n          ),',
    );
    expect(result.tree.get('apps/gateway/tsconfig.app.json')).toContain(
      '    {\n      "path": "../../packages/product-reviews-contract/tsconfig.lib.json"\n    }\n  ]\n}',
    );
    expect(result.tree.get('apps/gateway/package.json')).toContain(
      '"@storefront/orders-contract": "*",\n    "@storefront/product-reviews-contract": "*"\n',
    );
  });

  it('surfaces the gateway error message in the generated client', async () => {
    const result = await run({ name: 'product-reviews' });

    expect(result.tree.get('apps/{= .name =}/src/client.ts')).toContain('body?.message');
  });

  it('honours explicit ports', async () => {
    const result = await run({ name: 'reviews', webPort: 3200, servicePort: 4300 });

    expect(result.tree.get('apps/shell/src/mf.ts')).toContain('http://localhost:3200/remoteEntry.js');
  });

  it('refuses a feature that already exists and writes nothing', async () => {
    const result = await run({ name: 'catalog' });

    expect(result.error).toBeDefined();
    expect(result.tree.size).toBe(0);
  });

  it('refuses a name that is not kebab-case', async () => {
    const result = await run({ name: 'ProductReviews' });

    expect(result.error).toBeDefined();
    expect(result.tree.size).toBe(0);
  });
});
