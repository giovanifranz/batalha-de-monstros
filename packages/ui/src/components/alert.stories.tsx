import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkles } from 'lucide-react';
import { expect } from 'storybook/test';
import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert.tsx';
import { Button } from './button.tsx';

const meta = {
  component: Alert,
  tags: ['ai-generated'],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Atualização disponível</AlertTitle>
      <AlertDescription>Uma nova versão está pronta para instalar.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>Falha ao salvar</AlertTitle>
      <AlertDescription>Verifique a conexão e tente novamente.</AlertDescription>
    </Alert>
  ),
};

// Prova que o preview carregou o CSS real do tema, não só que o componente montou.
export const CssCheck: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Cantos do tema Retro Arcade</AlertTitle>
      <AlertDescription>rounded-lg deve resolver para --radius (4px).</AlertDescription>
    </Alert>
  ),
  play: async ({ canvas }) => {
    const alert = canvas.getByRole('alert');
    // `rounded-lg` mapeia para 4px neste tema; o padrão do Tailwind não é 4px.
    await expect(getComputedStyle(alert).borderRadius).toBe('4px');
  },
};

export const ComAcao: Story = {
  render: () => (
    <Alert>
      <Sparkles />
      <AlertTitle>Lutadores pré-selecionados</AlertTitle>
      <AlertDescription>Ignaruk e Petragon já estão escalados para este duelo.</AlertDescription>
      <AlertAction>
        <Button variant="secondary" size="sm">
          Limpar pré-seleção
        </Button>
      </AlertAction>
    </Alert>
  ),
  play: async ({ canvas }) => {
    const title = canvas.getByText('Lutadores pré-selecionados');
    const action = canvas.getByRole('button', { name: 'Limpar pré-seleção' });

    // A ação fica NO FLUXO, numa linha própria — nunca por cima do título.
    await expect(action.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      title.getBoundingClientRect().bottom,
    );
  },
};
