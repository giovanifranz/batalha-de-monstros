import { expect, type Page } from '@playwright/test';
import { createTestModel } from '@xstate/graph';
import type { SnapshotFrom, StateValue } from 'xstate';
import { battleSetupMachine } from '../src/machines/battle-setup.machine.ts';
import { test } from './fixtures/arena.ts';
import { AUROX, BRONTOR } from './fixtures/monsters.ts';
import { monsterCard } from './helpers/locators.ts';

const model = createTestModel(battleSetupMachine, {
  events: [
    { type: 'fighter.picked', monster: AUROX },
    { type: 'fighter.picked', monster: BRONTOR },
    { type: 'sides.swapped' },
  ],
});

const slotsOcupados = 'button[aria-label^="Remover "]';

const GESTURES = ['fighter.picked', 'sides.swapped', 'selection.cleared'] as const;
type Gesture = (typeof GESTURES)[number];

const STATES = ['empty', 'partial', 'ready'] as const;
type State = (typeof STATES)[number];

function executors(
  page: Page,
): Record<Gesture, (step: { event: { type: string } }) => Promise<void>> {
  return {
    'fighter.picked': async ({ event }) => {
      const { monster } = event as unknown as { monster: { name: string } };
      await monsterCard(page, monster.name).click();
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

function stateAssertions(page: Page): Record<State, () => Promise<void>> {
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

function descrever(steps: readonly { event: { type: string } }[], state: StateValue): string {
  const name = typeof state === 'string' ? state : JSON.stringify(state);

  const gestures = steps
    .filter((step) => step.event.type !== 'xstate.init')
    .map((step) => {
      const evento = step.event as { type: string; monster?: { name: string } };
      return evento.monster ? `${evento.type}(${evento.monster.name})` : evento.type;
    });

  return gestures.length ? `chega em "${name}" via ${gestures.join(' → ')}` : `começa em "${name}"`;
}

const TRAVERSAL_LIMIT = 5_000;

let paths: ReturnType<typeof model.getShortestPaths> = [];
let falhaDaTravessia: Error | null = null;
try {
  paths = model.getShortestPaths({ limit: TRAVERSAL_LIMIT });
} catch (erro) {
  falhaDaTravessia = erro instanceof Error ? erro : new Error('causa não-Error na travessia');
}

if (falhaDaTravessia) {
  const cause = falhaDaTravessia.message;

  test('a travessia do modelo cabe no limite configurado', () => {
    throw new Error(
      `A travessia estourou LIMITE_DE_TRAVESSIA (${TRAVERSAL_LIMIT}). O requisito é ` +
        `nós × eventos concretos; suba o teto e confira a aritmética no comentário. ` +
        `Causa: ${cause}`,
    );
  });
}

function eventosDaAdjacencia(): string[] {
  const kinds = new Set<string>();

  for (const no of Object.values(model.getAdjacencyMap())) {
    const { transitions } = no as { transitions: Record<string, { event: { type: string } }> };
    for (const transicao of Object.values(transitions)) kinds.add(transicao.event.type);
  }

  return [...kinds].sort((a, b) => a.localeCompare(b));
}

test('todo evento do modelo tem um executor nesta suíte', () => {
  expect(
    eventosDaAdjacencia(),
    'evento declarado na máquina sem gesto correspondente em GESTOS',
  ).toEqual([...GESTURES].sort((a, b) => a.localeCompare(b)));
});

function statesWithoutAssertion(): string[] {
  const discovered = new Set<string>();

  for (const no of Object.values(model.getAdjacencyMap())) {
    const { state } = no as { state: SnapshotFrom<typeof battleSetupMachine> };
    if (STATES.some((key) => state.matches(key))) continue;

    discovered.add(typeof state.value === 'string' ? state.value : JSON.stringify(state.value));
  }

  return [...discovered].sort((a, b) => a.localeCompare(b));
}

test('todo estado alcançável tem asserção nesta suíte', () => {
  expect(
    statesWithoutAssertion(),
    'estado alcançável pela máquina sem asserção correspondente em ESTADOS',
  ).toEqual([]);
});

for (const path of paths) {
  test(`seleção — ${descrever(path.steps, path.state.value)}`, async ({ page }) => {
    await test.step('Dado que estou na tela de montar batalha', async () => {
      await page.goto('/battle');
      await expect(monsterCard(page, AUROX.name)).toBeVisible();
    });

    await path.test({
      states: stateAssertions(page),
      events: executors(page),
    });
  });
}
