import { createSerializer, createStandardSchemaV1, parseAsInteger, parseAsString } from 'nuqs';

/** `withDefault` também liga o `clearOnDefault` do nuqs: o padrão some da URL. */
export const browserParsers = {
  q: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
};

/**
 * Os MESMOS parsers como Standard Schema: sem esse segundo consumidor o router
 * descarta os params que o nuqs acabou de escrever. `partialOutput` porque o
 * router tipa os `<Link>` pela SAÍDA daqui, e sem ele todo link exigiria
 * `search={{ q: '', page: 1 }}`.
 */
const browserSearchSchema = createStandardSchemaV1(browserParsers, { partialOutput: true });

/**
 * O schema acima, mas TOLERANTE: no modo estrito um `?page=abc` viraria issue, o
 * router a transformaria em exceção da rota e a tela inteira daria lugar ao
 * `errorComponent`. Devolver `{}` descarta todos os params e não é observável —
 * a página lê a URL pelo `useQueryStates`, não pelo `Route.useSearch()`.
 */
export function validateBrowserSearch(search: Record<string, unknown>) {
  const result = browserSearchSchema['~standard'].validate(search);

  // A implementação do nuqs é síncrona; o Promise só existe no contrato do Standard Schema.
  if (result instanceof Promise) {
    throw new TypeError('validateSearch não aceita validação assíncrona.');
  }

  return result.issues ? {} : result.value;
}

/** Monta a URL sem navegar: é o que dá `href` de verdade aos links de paginação. */
export const serializeBrowserSearch = createSerializer(browserParsers);
