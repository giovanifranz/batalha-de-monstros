import type { Meta, StoryObj } from '@storybook/react-vite';
import { aquashell, duskfang, pyrelisk } from '../testing/fixtures.ts';
import { MonsterGrid } from './MonsterGrid.tsx';

const meta = {
  component: MonsterGrid,
} satisfies Meta<typeof MonsterGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cheio: Story = {
  args: { monsters: [pyrelisk, aquashell, duskfang] },
};

export const Carregando: Story = {
  args: { monsters: [], skeletonCount: 6 },
};

export const Misto: Story = {
  args: { monsters: [pyrelisk, aquashell], skeletonCount: 2 },
};

export const Vazio: Story = {
  args: { monsters: [] },
};
