import { create } from '@pbuilder/sdk/commons';
import type { Input } from './schema.generated.ts';
import { resourceNames } from '../shared/names.ts';

export default (input: Input) => {
  const n = resourceNames(input.name);

  create(`src/${n.pluralDashed}/schemas/${n.singularDashed}.schema.ts`, {
    options: {},
    template: `import * as mongoose from 'mongoose';

export const ${n.singularClass}Schema = new mongoose.Schema({}, { versionKey: false });

${n.singularClass}Schema.add({
  // Define fields here, one per line, then run:
  //   builder execute default:resource --schema=src/${n.pluralDashed}/schemas/${n.singularDashed}.schema.ts
  //
  // Supported shape (flat options only):
  //   sku: { type: String, required: true, unique: true },
  //   price: { type: Number, required: true },
  //   inStock: { type: Boolean, required: true, default: true },
  //   releasedAt: { type: Date, required: false },
  //
  // Embedded sub-schema (file must live in this same folder and be imported):
  //   import { CalibratedSchema } from './calibrated.schema';
  //   calibrated: { type: CalibratedSchema, required: false },
});
`,
  });
};
