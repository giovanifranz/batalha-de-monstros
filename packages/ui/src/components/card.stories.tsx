import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.tsx';
import { Badge } from './badge.tsx';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from './card.tsx';

const meta = {
  component: Card,
  tags: ['ai-generated'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
        <CardDescription>Ajustes gerais da conta.</CardDescription>
        <CardAction>
          <Badge>Novo</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Conteúdo livre do card.</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Salvar</Button>
      </CardFooter>
    </Card>
  ),
};

export const Compact: Story = {
  render: () => (
    <Card size="sm" className="w-64">
      <CardHeader>
        <CardTitle>Compacto</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">size="sm" reduz --card-spacing.</p>
      </CardContent>
    </Card>
  ),
};

export const WithoutFooter: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Somente conteúdo</CardTitle>
        <CardDescription>Sem rodapé nem ação.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card mínimo, só header + content.</p>
      </CardContent>
    </Card>
  ),
};
