import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { pyrelisk } from '../testing/fixtures.ts';
import { ImagePreview } from './ImagePreview.tsx';

const meta = {
  component: ImagePreview,
  render: (args) => (
    <div className="bg-muted flex h-36 w-64 items-center justify-center rounded-md">
      <ImagePreview {...args} />
    </div>
  ),
} satisfies Meta<typeof ImagePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SemImagem: Story = {
  args: { src: '', alt: '' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('sem imagem')).toBeVisible();
  },
};

export const Valida: Story = {
  args: { src: pyrelisk.imageUrl, alt: pyrelisk.name },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img')).toBeVisible();
  },
};

// `data:` inválida, e nunca um host `.invalid`: aquele nome não resolve, mas a
// resolução ainda passa pelo DNS e o `onError` chega tarde demais para o `waitFor`.
export const UrlQuebrada: Story = {
  args: { src: 'data:image/png;base64,quebrada', alt: 'Monstro' },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByText('Não foi possível carregar a imagem')).toBeVisible(),
    );
  },
};
