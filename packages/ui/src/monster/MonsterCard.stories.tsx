import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { AA_NORMAL_TEXT, textContrast } from '../testing/contrast.ts';
import { aquashell, duskfang, pyrelisk } from '../testing/fixtures.ts';
import { MonsterCard } from './MonsterCard.tsx';

const meta = {
  component: MonsterCard,
  render: (args) => (
    <div className="w-72">
      <MonsterCard {...args} />
    </div>
  ),
} satisfies Meta<typeof MonsterCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  args: { monster: pyrelisk },
};

export const ComBotaoRemoverEmHover: Story = {
  args: { monster: duskfang, onRemove: () => {} },
  play: async ({ canvas }) => {
    const botao = canvas.getByRole('button', { name: `Excluir ${duskfang.name}` });

    await expect(textContrast(botao, { pseudo: ':hover' })).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  },
};

export const ComBotaoRemoverEmHoverNoClaro: Story = {
  globals: { theme: 'light' },
  args: { monster: duskfang, onRemove: () => {} },
  play: async ({ canvas }) => {
    await expect(document.documentElement.classList.contains('dark')).toBe(false);

    const botao = canvas.getByRole('button', { name: `Excluir ${duskfang.name}` });

    await expect(textContrast(botao, { pseudo: ':hover' })).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  },
};

export const ComBotaoRemover: Story = {
  args: { monster: duskfang, onRemove: () => {} },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: `Excluir ${duskfang.name}` })).toBeVisible();
  },
};

export const ComBotaoEditar: Story = {
  args: { monster: duskfang, onEdit: () => {} },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: `Editar ${duskfang.name}` })).toBeVisible();
  },
};

export const ComBotaoEditarEmHover: Story = {
  args: { monster: duskfang, onEdit: () => {} },
  play: async ({ canvas }) => {
    const botao = canvas.getByRole('button', { name: `Editar ${duskfang.name}` });

    await expect(textContrast(botao, { pseudo: ':hover' })).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  },
};

export const ComBotaoEditarEmHoverNoClaro: Story = {
  globals: { theme: 'light' },
  args: { monster: duskfang, onEdit: () => {} },
  play: async ({ canvas }) => {
    await expect(document.documentElement.classList.contains('dark')).toBe(false);

    const botao = canvas.getByRole('button', { name: `Editar ${duskfang.name}` });

    await expect(textContrast(botao, { pseudo: ':hover' })).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  },
};

export const ComAmbasAsAcoes: Story = {
  args: { monster: duskfang, onEdit: () => {}, onRemove: () => {} },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: `Editar ${duskfang.name}` })).toBeVisible();
    await expect(canvas.getByRole('button', { name: `Excluir ${duskfang.name}` })).toBeVisible();
  },
};

export const Selecionavel: Story = {
  args: { monster: aquashell, onSelect: () => {} },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  },
};

export const SelecionadoComoLutador1: Story = {
  args: { monster: pyrelisk, onSelect: () => {}, selectedAs: 'left' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Lutador 1')).toBeVisible();
    await expect(canvas.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  },
};

export const BadgeDoSlotNaoEhCortada: Story = {
  args: { monster: pyrelisk, onSelect: () => {}, selectedAs: 'left' },
  play: async ({ canvas, canvasElement }) => {
    const badge = canvas.getByText('Lutador 1');
    const card = canvasElement.querySelector('[data-slot="card"]');

    const badgeRect = badge.getBoundingClientRect();
    const cardRect = card!.getBoundingClientRect();

    await expect(badgeRect.height).toBeGreaterThan(0);
    await expect(badgeRect.top).toBeLessThan(cardRect.top);
    await expect(getComputedStyle(card!).overflow).toBe('visible');
  },
};

export const ArteQuebrada: Story = {
  args: { monster: { ...pyrelisk, imageUrl: 'data:image/png;base64,quebrada' } },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-slot="art-fallback"]')).toBeVisible(),
    );
  },
};

export const NomeLongo: Story = {
  args: { monster: { ...pyrelisk, name: 'Nome Extremamente Longo Para Testar Truncamento' } },
};
