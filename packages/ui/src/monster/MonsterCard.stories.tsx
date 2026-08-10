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

/**
 * O HOVER do botão de excluir, medido — nenhuma outra guarda pega isso, porque o
 * axe nunca passa o mouse. A asserção é sobre o NÚMERO lido do pixel composto,
 * não sobre classe nem sobre cor.
 */
export const ComBotaoRemoverEmHover: Story = {
  args: { monster: duskfang, onRemove: () => {} },
  play: async ({ canvas }) => {
    const botao = canvas.getByRole('button', { name: `Excluir ${duskfang.name}` });

    await expect(textContrast(botao, { pseudo: ':hover' })).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  },
};

/**
 * O mesmo hover no tema claro, onde o defeito era pior. O preview roda em `dark`
 * por padrão, então sem `globals` esta medição nunca chegaria ao outro tema.
 */
export const ComBotaoRemoverEmHoverNoClaro: Story = {
  globals: { theme: 'light' },
  args: { monster: duskfang, onRemove: () => {} },
  play: async ({ canvas }) => {
    // Guarda contra teste vazio: um `globals` ignorado faria esta story medir o escuro de novo.
    await expect(document.documentElement.classList.contains('dark')).toBe(false);

    const botao = canvas.getByRole('button', { name: `Excluir ${duskfang.name}` });

    await expect(textContrast(botao, { pseudo: ':hover' })).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  },
};

export const ComBotaoRemover: Story = {
  args: { monster: duskfang, onRemove: () => {} },
  play: async ({ canvas }) => {
    // O nome ACESSÍVEL carrega o dono; o visível continua sendo prefixo dele (2.5.3).
    await expect(canvas.getByRole('button', { name: `Excluir ${duskfang.name}` })).toBeVisible();
  },
};

export const Selecionavel: Story = {
  args: { monster: aquashell, onSelect: () => {} },
  play: async ({ canvas }) => {
    // `interactive` vira true assim que `onSelect` existe.
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

// `image_url` é texto livre: link quebrado é o caso comum, não a exceção.
export const ArteQuebrada: Story = {
  args: { monster: { ...pyrelisk, imageUrl: 'data:image/png;base64,quebrada' } },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-slot="art-fallback"]')).toBeVisible(),
    );
  },
};

// O nome precisa truncar em vez de estourar o card.
export const NomeLongo: Story = {
  args: { monster: { ...pyrelisk, name: 'Nome Extremamente Longo Para Testar Truncamento' } },
};
