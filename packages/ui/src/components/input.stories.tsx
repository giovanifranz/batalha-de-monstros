import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Input } from './input.tsx';

const meta = {
  component: Input,
  tags: ['ai-generated'],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { type: 'email', placeholder: 'nome@exemplo.com' },
};

export const Disabled: Story = {
  args: { placeholder: 'Desabilitado', disabled: true },
};

export const Filled: Story = {
  args: { placeholder: 'Digite seu nome' },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByPlaceholderText('Digite seu nome');
    await userEvent.type(input, 'Ana Souza');
    await expect(input).toHaveValue('Ana Souza');
  },
};
