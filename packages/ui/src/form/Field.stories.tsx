import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Input } from '../components/input.tsx';
import { Field } from './Field.tsx';

const meta = {
  component: Field,
  args: {
    children: (control) => <Input {...control} placeholder="Como te chamamos?" />,
  },
  render: (args) => (
    <div className="w-72">
      <Field {...args} />
    </div>
  ),
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  args: { label: 'Nome' },
};

export const ComDica: Story = {
  args: { label: 'Nome', hint: 'Use pelo menos 2 caracteres.' },
};

export const ComErro: Story = {
  args: { label: 'Nome', error: 'Use pelo menos 2 caracteres' },
  play: async ({ canvas }) => {
    const input = canvas.getByPlaceholderText('Como te chamamos?');
    const message = canvas.getByRole('alert');

    // O painel de a11y só confirma que existe `aria-describedby`; isto prova que ele aponta para o id certo.
    await expect(input.getAttribute('aria-describedby')).toBe(message.id);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  },
};

// Com hint E erro juntos, o <p> do hint não é renderizado: o `aria-describedby`
// não pode apontar para um hintId que não existe no DOM.
export const ComDicaEErro: Story = {
  args: {
    label: 'Nome',
    hint: 'Use pelo menos 2 caracteres.',
    error: 'Use pelo menos 2 caracteres',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByPlaceholderText('Como te chamamos?');
    const message = canvas.getByRole('alert');

    await expect(input.getAttribute('aria-describedby')).toBe(message.id);
    await expect(canvas.queryByText('Use pelo menos 2 caracteres.')).not.toBeInTheDocument();
  },
};
