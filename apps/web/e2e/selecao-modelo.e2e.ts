import { expect, type Page } from '@playwright/test';
import { createTestModel } from '@xstate/graph';
import type { SnapshotFrom, StateValue } from 'xstate';
import { battleSetupMachine } from '../src/machines/battle-setup.machine.ts';
import { test } from './fixtures/arena.ts';
import { AUROX, BRONTOR } from './fixtures/monsters.ts';
import { cardDoMonstro } from './helpers/locators.ts';

const model = createTestModel(battleSetupMachine, {
  events: [
    { type: 'fighter.picked', monster: AUROX },
    { type: 'fighter.picked', monster: BRONTOR },
    { type: 'sides.swapped' },
  ],
});

const slotsOcupados = 'button[aria-label^="Remover "]';

const GESTOS = ['fighter.picked', 'sides.swapped', 'selection.cleared'] as const;
type Gesto = (typeof GESTOS)[number];

const ESTADOS = ['empty', 'partial', 'ready'] as const;
type Estado = (typeof ESTADOS)[number];

function executores(
  page: Page,
): Record<Gesto, (step: { event: { type: string } }) => Promise<void>> {
  return {
    'fighter.picked': async ({ event }) => {
      const { monster } = event as unknown as { monster: { name: string } };
      await cardDoMonstro(page, monster.name).click();
    },

    'sides.swapped': async () => {
      await page.getByRole('button', { name: 'Inverter lutadores' }).click();
    },

    'selection.cleared': async () => {
      const xis = page.locator(slotsOcupados);

      for (let restantes = await xis.count(); restantes > 0; restantes -= 1) {
        await xis.last().click();
        await expect(xis).toHaveCount(restantes - 1);
      }
    },
  };
}

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

const LIMITE_DE_TRAVESSIA = 5_000;

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

function eventosDaAdjacencia(): string[] {
  const tipos = new Set<string>();

  for (const no of Object.values(model.getAdjacencyMap())) {
    const { transitions } = no as { transitions: Record<string, { event: { type: string } }> };
    for (const transicao of Object.values(transitions)) tipos.add(transicao.event.type);
  }

  return [...tipos].sort((a, b) => a.localeCompare(b));
}

test('todo evento do modelo tem um executor nesta suíte', () => {
  expect(
    eventosDaAdjacencia(),
    'evento declarado na máquina sem gesto correspondente em GESTOS',
  ).toEqual([...GESTOS].sort((a, b) => a.localeCompare(b)));
});

function estadosSemAssercao(): string[] {
  const descobertos = new Set<string>();

  for (const no of Object.values(model.getAdjacencyMap())) {
    const { state } = no as { state: SnapshotFrom<typeof battleSetupMachine> };
    if (ESTADOS.some((chave) => state.matches(chave))) continue;

    descobertos.add(typeof state.value === 'string' ? state.value : JSON.stringify(state.value));
  }

  return [...descobertos].sort((a, b) => a.localeCompare(b));
}

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
