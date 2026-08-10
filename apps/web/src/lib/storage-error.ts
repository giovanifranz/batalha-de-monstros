/**
 * Reconhece "o armazenamento do navegador está cheio" numa falha de escrita.
 * Dois nomes para o mesmo erro: `QuotaExceededError` (padrão) e
 * `NS_ERROR_DOM_QUOTA_REACHED` (Firefox); o `code` legado é derivado do nome e
 * nenhum navegador o exercita sozinho. Percorre a cadeia de `cause` para um
 * embrulho futuro não devolver a mensagem genérica em silêncio.
 */
export function isStorageFull(error: unknown): boolean {
  for (let current: unknown = error; current instanceof Error; current = current.cause) {
    if (current.name === 'QuotaExceededError' || current.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return true;
    }
  }

  return false;
}

export const STORAGE_FULL_MESSAGE =
  'O armazenamento deste navegador está cheio. Use um link para a imagem em vez de colar a imagem inteira, ou exclua algum monstro para abrir espaço.';

/**
 * O toast do app é `pointer-events: none`, logo não pausa no hover: a duração É
 * o tempo de leitura. 143 caracteres a 17–20 por segundo não cabem nos 4 s padrão.
 */
export const STORAGE_FULL_DURATION_MS = 12_000;

/** Mesma conta para qualquer toast longo: 7 s cobrem uma frase de ~80 caracteres. */
export const TOAST_LONGO_MS = 7000;
