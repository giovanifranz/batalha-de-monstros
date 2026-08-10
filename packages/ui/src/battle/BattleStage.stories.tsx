import type { Meta, StoryObj } from '@storybook/react-vite';
import { aquashell, pyrelisk } from '../testing/fixtures.ts';
import { BattleStage } from './BattleStage.tsx';

const fighters = { left: pyrelisk, right: aquashell };

const meta = {
  title: 'Batalha/BattleStage',
  component: BattleStage,
  args: { fighters, hp: { left: pyrelisk.hp, right: aquashell.hp } },
} satisfies Meta<typeof BattleStage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HpCheio: Story = {};
export const EsquerdaAtacando: Story = { args: { attacking: 'left', takingHit: 'right' } };
// Os três limiares de cor da barra, num relance.
export const HpMedio: Story = { args: { hp: { left: 40, right: 45 } } };
export const HpCritico: Story = { args: { hp: { left: 8, right: 12 } } };
export const DireitaDerrotada: Story = { args: { hp: { left: 30, right: 0 } } };
