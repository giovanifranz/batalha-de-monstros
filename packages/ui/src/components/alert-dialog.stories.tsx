import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { Button } from './button.tsx';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog.tsx';

const meta = {
  component: AlertDialog,
  tags: ['ai-generated'],
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Example() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Excluir conta</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const Default: Story = {
  render: () => <Example />,
};

export const OpenAndClose: Story = {
  render: () => <Example />,
  play: async ({ canvas, userEvent, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: /excluir conta/i }));

    // O conteúdo vai por Portal direto no document.body, fora da árvore de `canvas`.
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole('alertdialog')).toBeVisible();

    await userEvent.click(body.getByRole('button', { name: /cancelar/i }));
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
  },
};
