import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { pyrelisk } from '../testing/fixtures.ts';
import { HpBar } from './HpBar.tsx';

const meta = {
  component: HpBar,
  args: { label: `HP de ${pyrelisk.name}`, max: pyrelisk.hp },
  render: (args) => (
    <div className="w-56">
      <HpBar {...args} />
    </div>
  ),
} satisfies Meta<typeof HpBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sem asserção dá para trocar `mid` e `low` de lugar e as stories continuam
// verdes: elas RENDERIZAM os três estados, mas não afirmam nada sobre eles.
const expectTone = async (root: HTMLElement, tone: string) => {
  const fill = root.querySelector('[role="progressbar"]')?.firstElementChild as HTMLElement;

  await expect(fill).toHaveClass(tone);
};

// Os três limiares de cor da barra, num relance.
export const Saudavel: Story = {
  args: { current: 70 },
  play: ({ canvasElement }) => expectTone(canvasElement, 'bg-hp-high'),
};
export const Alerta: Story = {
  args: { current: 25 },
  play: ({ canvasElement }) => expectTone(canvasElement, 'bg-hp-mid'),
};
export const Critico: Story = {
  args: { current: 10 },
  play: ({ canvasElement }) => expectTone(canvasElement, 'bg-hp-low'),
};
export const Zerado: Story = {
  args: { current: 0 },
  play: ({ canvasElement }) => expectTone(canvasElement, 'bg-hp-low'),
};

// As duas stories abaixo fixam que os limiares são EXCLUSIVOS (`>`): o valor
// exato da fronteira cai sempre na faixa de baixo. Calculadas a partir de
// `pyrelisk.hp` para continuarem cravadas se a fixture mudar.
const metadeExataDoHp = pyrelisk.hp / 2;

/** `metadeExataDoHp / pyrelisk.hp` = 50,0% cravado. `> 0.5` é falso, então ainda é `mid`, não `high`. */
export const LimiarAltoExato: Story = {
  args: { current: metadeExataDoHp },
  play: ({ canvasElement }) => expectTone(canvasElement, 'bg-hp-mid'),
};

/** 20/100 = 20,0% cravado. `> 0.2` é falso, então ainda é `low`, não `mid`. */
export const LimiarBaixoExato: Story = {
  args: { current: 20, max: 100 },
  play: ({ canvasElement }) => expectTone(canvasElement, 'bg-hp-low'),
};

/**
 * A asserção lê o `style` inline, não o computado: `prefers-reduced-motion`
 * sobrescreve o computado com `!important`, e a story mediria a preferência do
 * runner em vez do contrato do componente.
 */
export const EsvaziamentoRapido: Story = {
  args: { current: 30, drainMs: 200 },
  play: async ({ canvas }) => {
    const fill = canvas.getByRole('progressbar').firstElementChild as HTMLElement;

    await expect(fill.style.transitionDuration).toBe('200ms');
  },
};

/** Sem a prop, o padrão continua sendo o ritmo de 1x. */
export const EsvaziamentoPadrao: Story = {
  args: { current: 30 },
  play: async ({ canvas }) => {
    const fill = canvas.getByRole('progressbar').firstElementChild as HTMLElement;

    await expect(fill.style.transitionDuration).toBe('700ms');
  },
};

// `current > max` não pode estourar o track nem relatar valor fora do range.
export const AcimaDoMaximo: Story = {
  args: { current: 999 },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', String(pyrelisk.hp));

    const fill = bar.firstElementChild as HTMLElement;
    await expect(fill.style.width).toBe('100%');
  },
};
