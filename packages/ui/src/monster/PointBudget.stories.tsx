import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { PointBudget } from './PointBudget.tsx';

const meta = {
  component: PointBudget,
  render: (args) => (
    <div className="w-80">
      <PointBudget {...args} />
    </div>
  ),
} satisfies Meta<typeof PointBudget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DentroDoOrcamento: Story = {
  args: { used: 168, budget: 250 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Restam 82 pontos')).toBeVisible();
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();

    await expect(canvas.getByRole('status')).toHaveTextContent('Restam 82 pontos');
  },
};

export const UltimoPonto: Story = {
  args: { used: 249, budget: 250 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Resta 1 ponto')).toBeVisible();
  },
};

export const AcimaDoLimite: Story = {
  args: {
    used: 253,
    budget: 250,
    error: 'A soma dos atributos não pode ultrapassar 250 pontos',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('3 pontos acima do limite')).toBeVisible();

    const alert = canvas.getByRole('alert');
    await expect(alert).toHaveTextContent('A soma dos atributos não pode ultrapassar 250 pontos');

    const status = canvas.getByRole('status');
    await expect(status).toHaveTextContent('3 pontos acima do limite');
    await expect(status).not.toHaveTextContent('A soma dos atributos');

    const anunciado = [...status.children]
      .filter((filho) => filho.getAttribute('aria-hidden') !== 'true')
      .map((filho) => filho.textContent)
      .join('');
    await expect(anunciado).toBe('3 pontos acima do limite. 253 de 250 pontos usados.');
  },
};
