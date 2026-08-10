import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Input } from './input.tsx';
import { Label } from './label.tsx';

const meta = {
  component: Label,
  tags: ['ai-generated'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Apelido' } };

export const AssociatedWithInput: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="nickname">Apelido</Label>
      <Input id="nickname" placeholder="Como te chamamos?" />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    // `htmlFor` associa o Label ao Input: clicar no texto foca o campo.
    await userEvent.click(canvas.getByText('Apelido'));
    await expect(canvas.getByPlaceholderText('Como te chamamos?')).toHaveFocus();
  },
};
