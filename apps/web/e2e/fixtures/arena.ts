import type { Monster } from '@arena/domain/monster';
import { expect, test as base } from '@playwright/test';
import { ROSTER } from './monsters.ts';

/** As mesmas chaves que a aplicação escreve — não invente uma terceira. */
const ROSTER_KEY = 'arena:roster';
const SETTINGS_KEY = 'arena:settings';

/**
 * O `arena:roster` NÃO é um array: o `localStorageCollectionOptions` grava um
 * objeto indexado pela chave da linha (prefixo `s:`), cada valor embrulhado em
 * `{ versionKey, data }`. O `versionKey` é determinístico de propósito — o app
 * só compara igualdade, nunca interpreta o conteúdo.
 */
function rosterPayload(monsters: readonly Monster[]): string {
  return JSON.stringify(
    Object.fromEntries(
      monsters.map((monster) => [
        `s:${monster.id}`,
        { versionKey: `v-${monster.id}`, data: monster },
      ]),
    ),
  );
}

/**
 * O envelope do `persist` do `@xstate/store`, com o `version` batendo com o de
 * `settings.store.ts`. Escreve o contexto INTEIRO para o tema não depender do default.
 */
function settingsPayload(speed: PlaybackSpeed): string {
  return JSON.stringify({ context: { speed, theme: 'dark' }, version: 1 });
}

export type PlaybackSpeed = 1 | 2 | 4;

type ArenaOptions = {
  /**
   * Quais monstros do `ROSTER` o navegador já encontra gravados, **por nome**.
   *
   * NOMES e não objetos `Monster`: o `isFixtureTuple` do Playwright é
   * `Array.isArray(v) && typeof v[1] === 'object'`, então `[AUROX, BRONTOR]`
   * seria lido como `[valor, opções]` e o fixture receberia só o primeiro.
   *
   * Um elenco VAZIO não deixa a tela vazia — deixa a semente do app entrar.
   */
  roster: readonly string[];
  /**
   * A velocidade de playback já persistida. 4x não é preferência: o duelo de
   * referência custa 13,1s em 1x, mais que o timeout do `expect`. Não existe
   * override por URL.
   */
  speed: PlaybackSpeed;
};

function resolverElenco(nomes: readonly string[]): readonly Monster[] {
  return nomes.map((nome) => {
    const encontrado = ROSTER.find((monster) => monster.name === nome);
    if (!encontrado) throw new Error(`Monstro de fixture inexistente: ${nome}`);

    return encontrado;
  });
}

/**
 * `test` da arena. Toda página nasce com o roster e as configurações já no
 * `localStorage` (por `addInitScript`, antes de qualquer script da página) e com
 * um guarda que REPROVA o teste se alguma requisição sair da origem do dev server.
 */
export const test = base.extend<ArenaOptions>({
  roster: [ROSTER.map((monster) => monster.name), { option: true }],
  speed: [4, { option: true }],

  page: async ({ page, baseURL, roster, speed }, use) => {
    // `getItem(...) === null` e não escrita incondicional: o `addInitScript` roda
    // em TODA navegação, e sem a guarda um `reload()` ressuscitaria o excluído.
    await page.addInitScript(
      ([rosterKey, rosterValue, settingsKey, settingsValue]: string[]) => {
        if (window.localStorage.getItem(rosterKey) === null) {
          window.localStorage.setItem(rosterKey, rosterValue);
        }
        if (window.localStorage.getItem(settingsKey) === null) {
          window.localStorage.setItem(settingsKey, settingsValue);
        }
      },
      [ROSTER_KEY, rosterPayload(resolverElenco(roster)), SETTINGS_KEY, settingsPayload(speed)],
    );

    /**
     * A propriedade guardada é **zero requisição CROSS-ORIGIN** — as centenas
     * para o próprio dev server são esperadas.
     *
     * Comparação por `URL(...).origin` e NUNCA por `startsWith`:
     * `'http://localhost:5174'.startsWith` casa com `http://localhost:51740/…`.
     * A checagem de esquema vem ANTES do parse porque `new URL()` dá
     * `origin: 'null'` para `data:`/`blob:`/`about:`.
     *
     * FRESTAS CONHECIDAS: `WebSocket` não passa por `page.on('request')` nem por
     * `page.route`, e um `<link rel="preconnect">` faz DNS e TLS sem requisição HTTP.
     */
    const origin = new URL(baseURL ?? 'http://localhost').origin;
    const escaped: string[] = [];
    const isLocal = (url: string) => {
      if (/^(data|blob|about|chrome-error):/.test(url)) return true;

      try {
        return new URL(url).origin === origin;
      } catch {
        // URL que nem parseia não é a origem do dev server.
        return false;
      }
    };

    page.on('request', (request) => {
      if (!isLocal(request.url())) escaped.push(`${request.method()} ${request.url()}`);
    });
    await page.route(
      (url) => !isLocal(url.toString()),
      (route) => route.abort(),
    );

    await use(page);

    expect(escaped, 'a suíte tem de terminar com zero requisição cross-origin').toEqual([]);
  },
});
