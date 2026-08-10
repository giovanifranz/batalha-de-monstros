import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { AA_NORMAL_TEXT, textContrast } from '../testing/contrast.ts';
import { Button } from './button.tsx';

const VARIANTES = ['Primary', 'Secondary', 'Destructive', 'Outline', 'Ghost'] as const;

const TodasAsVariantesRender = () => (
  <div className="flex flex-wrap gap-2">
    <Button>Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
  </div>
);

const medirHoverDeTodasAsVariantes =
  (temaEsperado: 'claro' | 'escuro'): NonNullable<StoryObj<typeof meta>['play']> =>
  async ({ canvas }) => {
    await expect(document.documentElement.classList.contains('dark')).toBe(
      temaEsperado === 'escuro',
    );

    const medido: Record<string, number> = {};

    for (const nome of VARIANTES) {
      const botao = canvas.getByRole('button', { name: nome });
      medido[nome] = textContrast(botao, { pseudo: ':hover' });
    }

    await expect(Object.entries(medido).filter(([, razao]) => razao < AA_NORMAL_TEXT)).toEqual([]);
  };

const meta = {
  title: 'Primitivos/Button',
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Lutar!' } };

export const TodasAsVariantes: Story = { render: TodasAsVariantesRender };

export const HoverDeTodasAsVariantes: Story = {
  render: TodasAsVariantesRender,
  play: medirHoverDeTodasAsVariantes('escuro'),
};

export const HoverDeTodasAsVariantesNoClaro: Story = {
  globals: { theme: 'light' },
  render: TodasAsVariantesRender,
  play: medirHoverDeTodasAsVariantes('claro'),
};
