import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { aquashell, pyrelisk } from '../testing/fixtures.ts';
import { VersusBar } from './VersusBar.tsx';

/** O `Card` do slot da vez — o que carrega `aria-current`. */
const slotDaVez = (root: HTMLElement) => root.querySelector('[aria-current="true"]');

const meta = {
  component: VersusBar,
  args: {
    left: null,
    right: null,
    activeSlot: 'left',
    canFight: false,
    onClear: () => {},
    onSwap: () => {},
    onFight: () => {},
  },
} satisfies Meta<typeof VersusBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * O slot da vez já foi marcado SÓ por `border-primary` — apagar a classe deixava
 * os 33 cenários de E2E verdes. Os dois portadores que não são cor ficam afirmados aqui.
 */
export const Vazia: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(slotDaVez(canvasElement)).toHaveTextContent('Lutador 1');
    await expect(slotDaVez(canvasElement)).toHaveTextContent('próximo');

    // Os DOIS renderizam o marcador; só um fica visível, e `invisible` também tira
    // o inativo da árvore de acessibilidade.
    const [marcadorEsquerdo, marcadorDireito] = canvas.getAllByText('próximo');
    await expect(marcadorEsquerdo).toBeVisible();
    await expect(marcadorDireito).not.toBeVisible();

    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Próxima escolha preenche o Lutador 1.',
    );
  },
};

export const UmLutador: Story = {
  args: { left: pyrelisk, activeSlot: 'right' },
  play: async ({ canvas, canvasElement }) => {
    // O `aria-current` acompanha o slot ATIVO, não o preenchido.
    await expect(slotDaVez(canvasElement)).toHaveTextContent('Lutador 2');
    await expect(slotDaVez(canvasElement)).toHaveTextContent('próximo');
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Próxima escolha preenche o Lutador 2.',
    );
  },
};

// `canFight` é prop, não `Boolean(left && right)`.
export const Pronta: Story = {
  args: { left: pyrelisk, right: aquashell, activeSlot: null, canFight: true },
  play: async ({ canvas, canvasElement }) => {
    // Ninguém está esperando clique: nenhum slot é "o próximo".
    await expect(slotDaVez(canvasElement)).toBeNull();
    await expect(canvas.getByRole('status')).toHaveTextContent(
      `Dupla completa: ${pyrelisk.name} contra ${aquashell.name}.`,
    );
  },
};

// Os dois slots cheios com a máquina ainda apontando um: o próximo clique SUBSTITUI alguém.
export const SubstituindoUmLutador: Story = {
  args: { left: pyrelisk, right: aquashell, activeSlot: 'left', canFight: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      `Próxima escolha substitui ${pyrelisk.name} no Lutador 1.`,
    );
  },
};
