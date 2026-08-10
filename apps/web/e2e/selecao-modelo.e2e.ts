import { expect, type Page } from '@playwright/test';
import { createTestModel } from '@xstate/graph';
import type { SnapshotFrom, StateValue } from 'xstate';
import { battleSetupMachine } from '../src/machines/battle-setup.machine.ts';
import { test } from './fixtures/arena.ts';
import { AUROX, BRONTOR } from './fixtures/monsters.ts';
import { cardDoMonstro } from './helpers/locators.ts';

/**
 * Cenários gerados por modelo: a `battleSetupMachine` é o modelo, a tela
 * `/battle` é o sistema sob teste, e a biblioteca gera os caminhos até cada
 * estado alcançável.
 *
 * `@xstate/graph`, e NUNCA `@xstate/test`: este último é v4-only.
 *
 * As duas travas nomeadas abaixo (`todo evento … tem um executor`, `todo estado
 * … tem asserção`) são obrigatórias, e não redundância: no `@xstate/graph` um
 * executor ausente é `await eventExec?.(step)` — no-op silencioso — e
 * `_getStateTestKeys` FILTRA as chaves pelo matcher, então um estado que não casa
 * com nenhuma simplesmente não executa asserção. Nos dois casos o caminho passa verde.
 */

/**
 * A traversal precisa de eventos CONCRETOS: `fighter.picked` carrega um `Monster`
 * e a biblioteca não tem como inventar um.
 *
 * Esta lista NÃO restringe a travessia — ela só PREENCHE o payload dos tipos que
 * aparecem nela. Todo evento declarado na máquina é explorado de qualquer jeito,
 * e por isso `selection.cleared` também precisa de executor sem constar aqui.
 */
const model = createTestModel(battleSetupMachine, {
  events: [
    { type: 'fighter.picked', monster: AUROX },
    { type: 'fighter.picked', monster: BRONTOR },
    { type: 'sides.swapped' },
  ],
});

/** Contar estes botões é ler quantos lutadores estão escalados. */
const slotsOcupados = 'button[aria-label^="Remover "]';

/** Lista NOMEADA para o teste de cobertura poder compará-la com o que o modelo gera. */
const GESTOS = ['fighter.picked', 'sides.swapped', 'selection.cleared'] as const;
type Gesto = (typeof GESTOS)[number];

/** Mesma razão do `GESTOS`; `assercoesDeEstado` devolve `Record<Estado, …>`, então falta de asserção é erro de tipo. */
const ESTADOS = ['empty', 'partial', 'ready'] as const;
type Estado = (typeof ESTADOS)[number];

/**
 * Como executar cada evento do modelo contra a UI real. O tipo pega quem edita
 * `GESTOS` sem editar isto; o teste de cobertura pega quem edita a MÁQUINA.
 */
function executores(
  page: Page,
): Record<Gesto, (step: { event: { type: string } }) => Promise<void>> {
  return {
    'fighter.picked': async ({ event }) => {
      // O tipo do executor apaga o payload, mas em runtime chega o evento inteiro.
      const { monster } = event as unknown as { monster: { name: string } };
      await cardDoMonstro(page, monster.name).click();
    },

    'sides.swapped': async () => {
      await page.getByRole('button', { name: 'Inverter lutadores' }).click();
    },

    /**
     * NENHUM controle da aplicação envia `selection.cleared` — a transição está
     * declarada na máquina e é órfã na UI. Este executor emula o gesto
     * equivalente, e sai inteiro no dia em que a máquina ou a UI for corrigida.
     *
     * Esvazia do DIREITO para o esquerdo, e a ordem importa: `togglePick` deixa o
     * `activeSlot` no slot que acabou de esvaziar, então só nessa ordem se chega
     * ao `activeSlot: 'left'` que `selection.cleared` produz. Nada verifica isso —
     * o `activeSlot` não tem equivalente acessível.
     */
    'selection.cleared': async () => {
      const xis = page.locator(slotsOcupados);

      for (let restantes = await xis.count(); restantes > 0; restantes -= 1) {
        await xis.last().click();
        await expect(xis).toHaveCount(restantes - 1);
      }
    },
  };
}

/** Pós-condição de cada estado na tela real. As chaves batem com `snapshot.matches(...)`, sem o prefixo do id. */
function assercoesDeEstado(page: Page): Record<Estado, () => Promise<void>> {
  return {
    empty: async () => {
      await expect(page.getByRole('button', { name: 'Lutar!' })).toBeDisabled();
      await expect(page.locator(slotsOcupados)).toHaveCount(0);
      await expect(page.getByText('Escale os dois lutadores')).toBeVisible();
    },
    partial: async () => {
      await expect(page.getByRole('button', { name: 'Lutar!' })).toBeDisabled();
      await expect(page.locator(slotsOcupados)).toHaveCount(1);
      await expect(page.getByText('Falta um lutador')).toBeVisible();
    },
    ready: async () => {
      await expect(page.getByRole('button', { name: 'Lutar!' })).toBeEnabled();
      await expect(page.locator(slotsOcupados)).toHaveCount(2);
    },
  };
}

/**
 * Título do teste gerado. O `path.description` da biblioteca serializa o payload
 * inteiro — aqui, o `data:` URI de cada monstro dentro do nome do teste.
 */
function descrever(steps: readonly { event: { type: string } }[], estado: StateValue): string {
  const nome = typeof estado === 'string' ? estado : JSON.stringify(estado);

  const gestos = steps
    .filter((step) => step.event.type !== 'xstate.init')
    .map((step) => {
      const evento = step.event as { type: string; monster?: { name: string } };
      return evento.monster ? `${evento.type}(${evento.monster.name})` : evento.type;
    });

  return gestos.length ? `chega em "${nome}" via ${gestos.join(' → ')}` : `começa em "${nome}"`;
}

/**
 * `limit` NÃO conta caminhos nem estados: é o número de desenfileiramentos da BFS
 * de `getAdjacencyMap`, e o requisito real é `nós × eventos concretos`. Hoje são
 * 32 nós e 4 eventos concretos, ou seja o mínimo que passa é 128.
 */
const LIMITE_DE_TRAVESSIA = 5_000;

/**
 * A travessia roda no ESCOPO DO MÓDULO: um `throw` aqui é falha de CARGA, e o
 * relatório mostra um crash de import em vez de um teste vermelho. O `try`
 * converte isso num único teste nomeado.
 */
let caminhos: ReturnType<typeof model.getShortestPaths> = [];
let falhaDaTravessia: Error | null = null;
try {
  caminhos = model.getShortestPaths({ limit: LIMITE_DE_TRAVESSIA });
} catch (erro) {
  falhaDaTravessia = erro instanceof Error ? erro : new Error('causa não-Error na travessia');
}

if (falhaDaTravessia) {
  const causa = falhaDaTravessia.message;

  test('a travessia do modelo cabe no limite configurado', () => {
    throw new Error(
      `A travessia estourou LIMITE_DE_TRAVESSIA (${LIMITE_DE_TRAVESSIA}). O requisito é ` +
        `nós × eventos concretos; suba o teto e confira a aritmética no comentário. ` +
        `Causa: ${causa}`,
    );
  });
}

/**
 * A fonte é a ADJACÊNCIA, e não os caminhos gerados: um evento pode ser declarado
 * na máquina e não cair em nenhum caminho MAIS CURTO, que é justamente o caso que
 * a trava abaixo existe para pegar.
 */
function eventosDaAdjacencia(): string[] {
  const tipos = new Set<string>();

  for (const no of Object.values(model.getAdjacencyMap())) {
    const { transitions } = no as { transitions: Record<string, { event: { type: string } }> };
    for (const transicao of Object.values(transitions)) tipos.add(transicao.event.type);
  }

  return [...tipos].sort((a, b) => a.localeCompare(b));
}

/**
 * A trava que fecha o no-op silencioso do `testTransition`. ALCANCE EXATO: o
 * XState DESCARTA uma transição sem `target` e com `actions: []`, então ela não
 * entra na adjacência e esta trava não a vê.
 */
test('todo evento do modelo tem um executor nesta suíte', () => {
  expect(
    eventosDaAdjacencia(),
    'evento declarado na máquina sem gesto correspondente em GESTOS',
  ).toEqual([...GESTOS].sort((a, b) => a.localeCompare(b)));
});

/**
 * Os estados alcançáveis que NENHUMA chave de `ESTADOS` cobre. Usa o mesmo
 * `matches` do `stateMatcher` do `@xstate/graph`, e não `state.value` na mão,
 * porque é ele quem decide se a asserção roda.
 */
function estadosSemAssercao(): string[] {
  const descobertos = new Set<string>();

  for (const no of Object.values(model.getAdjacencyMap())) {
    const { state } = no as { state: SnapshotFrom<typeof battleSetupMachine> };
    if (ESTADOS.some((chave) => state.matches(chave))) continue;

    descobertos.add(typeof state.value === 'string' ? state.value : JSON.stringify(state.value));
  }

  return [...descobertos].sort((a, b) => a.localeCompare(b));
}

/**
 * A trava simétrica, do lado dos ESTADOS: um estado alcançável que não casa com
 * nenhuma chave de `ESTADOS` não produz erro no `@xstate/graph`, produz um laço
 * VAZIO — os caminhos que o alcançam passam verdes com zero asserção executada.
 */
test('todo estado alcançável tem asserção nesta suíte', () => {
  expect(
    estadosSemAssercao(),
    'estado alcançável pela máquina sem asserção correspondente em ESTADOS',
  ).toEqual([]);
});

for (const path of caminhos) {
  test(`seleção — ${descrever(path.steps, path.state.value)}`, async ({ page }) => {
    await test.step('Dado que estou na tela de montar batalha', async () => {
      await page.goto('/battle');
      await expect(cardDoMonstro(page, AUROX.name)).toBeVisible();
    });

    await path.test({
      states: assercoesDeEstado(page),
      events: executores(page),
    });
  });
}
