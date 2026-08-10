import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Separator } from './separator.tsx';

const meta = {
  component: Separator,
  tags: ['ai-generated'],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64">
      <p>Seção acima</p>
      <Separator className="my-2" />
      <p>Seção abaixo</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-2">
      <span>Esquerda</span>
      <Separator orientation="vertical" />
      <span>Direita</span>
    </div>
  ),
};

export const NonDecorative: Story = {
  render: () => (
    <div className="w-64">
      <p>Seção A</p>
      <Separator className="my-2" decorative={false} />
      <p>Seção B</p>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('separator')).toBeVisible();
  },
};
