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

const expectTone = async (root: HTMLElement, tone: string) => {
  const fill = root.querySelector('[role="progressbar"]')?.firstElementChild as HTMLElement;

  await expect(fill).toHaveClass(tone);
};

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

const metadeExataDoHp = pyrelisk.hp / 2;

export const LimiarAltoExato: Story = {
  args: { current: metadeExataDoHp },
  play: ({ canvasElement }) => expectTone(canvasElement, 'bg-hp-mid'),
};

export const LimiarBaixoExato: Story = {
  args: { current: 20, max: 100 },
  play: ({ canvasElement }) => expectTone(canvasElement, 'bg-hp-low'),
};

export const EsvaziamentoRapido: Story = {
  args: { current: 30, drainMs: 200 },
  play: async ({ canvas }) => {
    const fill = canvas.getByRole('progressbar').firstElementChild as HTMLElement;

    await expect(fill.style.transitionDuration).toBe('200ms');
  },
};

export const EsvaziamentoPadrao: Story = {
  args: { current: 30 },
  play: async ({ canvas }) => {
    const fill = canvas.getByRole('progressbar').firstElementChild as HTMLElement;

    await expect(fill.style.transitionDuration).toBe('700ms');
  },
};

export const AcimaDoMaximo: Story = {
  args: { current: 999 },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', String(pyrelisk.hp));

    const fill = bar.firstElementChild as HTMLElement;
    await expect(fill.style.width).toBe('100%');
  },
};
