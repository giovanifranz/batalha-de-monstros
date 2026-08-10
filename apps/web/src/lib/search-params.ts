import { createSerializer, createStandardSchemaV1, parseAsInteger, parseAsString } from 'nuqs';

export const browserParsers = {
  q: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
};

const browserSearchSchema = createStandardSchemaV1(browserParsers, {
  partialOutput: true,
});

export function validateBrowserSearch(search: Record<string, unknown>) {
  const result = browserSearchSchema['~standard'].validate(search);

  if (result instanceof Promise) {
    throw new TypeError('validateSearch não aceita validação assíncrona.');
  }

  return result.issues ? {} : result.value;
}

export const serializeBrowserSearch = createSerializer(browserParsers);
