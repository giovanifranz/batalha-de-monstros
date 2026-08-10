import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { pyrelisk } from '../testing/fixtures.ts';
import { MonsterArt } from './MonsterArt.tsx';

const arteQuebrada = 'data:image/png;base64,quebrada';

const meta = {
  component: MonsterArt,
  args: { className: 'size-16 rounded-md object-contain', iconClassName: 'size-6' },
} satisfies Meta<typeof MonsterArt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Carregada: Story = {
  args: { src: pyrelisk.imageUrl },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="art-fallback"]')).toBeNull();
  },
};

export const Quebrada: Story = {
  args: { src: arteQuebrada },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-slot="art-fallback"]')).toBeVisible(),
    );

    const fallback = canvasElement.querySelector('[data-slot="art-fallback"]') as HTMLElement;
    await expect(fallback.offsetWidth).toBe(64);
    await expect(fallback.offsetHeight).toBe(64);
  },
};

export const FallbackNaoEAnunciado: Story = {
  args: { src: arteQuebrada },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-slot="art-fallback"]')).toBeVisible(),
    );

    await expect(canvasElement.querySelector('[data-slot="art-fallback"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  },
};
