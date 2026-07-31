// Naive english inflection — enough for resource naming; pass an explicit
// plural/singular pair through the schema path convention when it guesses wrong.
export const singularize = (word: string): string => {
  if (/ies$/.test(word)) return word.replace(/ies$/, 'y');
  // Strip "es" only after a true sibilant stem (boxes → box, classes → class);
  // words ending in "-se" (warehouses, databases) just drop the trailing "s".
  if (/(ss|x|z|ch|sh)es$/.test(word)) return word.replace(/es$/, '');
  if (/s$/.test(word) && !/ss$/.test(word)) return word.replace(/s$/, '');
  return word;
};

export const pluralize = (word: string): string => {
  if (word !== singularize(word)) return word;
  if (/y$/.test(word) && !/[aeiou]y$/.test(word)) return word.replace(/y$/, 'ies');
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
};

const splitWords = (value: string): string[] =>
  value
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .trim()
    .split(/\s+/);

export const classify = (value: string): string =>
  splitWords(value)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

export const dasherize = (value: string): string =>
  splitWords(value)
    .map((w) => w.toLowerCase())
    .join('-');

export const camelize = (value: string): string => {
  const classified = classify(value);
  return classified.charAt(0).toLowerCase() + classified.slice(1);
};

export interface ResourceNames {
  singular: string; // product
  plural: string; // products
  singularClass: string; // Product
  pluralClass: string; // Products
  singularDashed: string; // product
  pluralDashed: string; // products
  singularCamel: string; // product
  pluralCamel: string; // products
}

export const resourceNames = (name: string): ResourceNames => {
  const singular = singularize(camelize(name));
  const plural = pluralize(singular);

  return {
    singular,
    plural,
    singularClass: classify(singular),
    pluralClass: classify(plural),
    singularDashed: dasherize(singular),
    pluralDashed: dasherize(plural),
    singularCamel: camelize(singular),
    pluralCamel: camelize(plural),
  };
};
