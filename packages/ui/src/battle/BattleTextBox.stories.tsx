import type { Meta, StoryObj } from '@storybook/react-vite';
import type { BattleTurn } from '@arena/domain/battle';
import { expect } from 'storybook/test';
import { aquashell, pyrelisk } from '../testing/fixtures.ts';
import { BattleTextBox } from './BattleTextBox.tsx';

const fighters = { left: pyrelisk, right: aquashell };

const damageTurn: BattleTurn = {
  index: 0,
  round: 1,
  attacker: 'left',
  defender: 'right',
  damage: 12,
  defenderHpBefore: 79,
  defenderHpAfter: 67,
  isChip: false,
};

const chipTurn: BattleTurn = {
  ...damageTurn,
  index: 1,
  damage: 1,
  defenderHpBefore: 67,
  defenderHpAfter: 66,
  isChip: true,
};

const defeatTurn: BattleTurn = {
  ...damageTurn,
  index: 2,
  damage: 20,
  defenderHpBefore: 20,
  defenderHpAfter: 0,
  isChip: false,
};

// `isChip` e `defenderHpAfter === 0` não se excluem: este é o frame em que os
// dois ramos de `buildMessage` se sobrepõem.
const chipDefeatTurn: BattleTurn = {
  ...damageTurn,
  index: 3,
  damage: 1,
  defenderHpBefore: 1,
  defenderHpAfter: 0,
  isChip: true,
};

const meta = {
  component: BattleTextBox,
  args: { fighters, beat: 'announce', status: 'playing', winnerName: pyrelisk.name },
  render: (args) => (
    <div className="w-96">
      <BattleTextBox {...args} />
    </div>
  ),
} satisfies Meta<typeof BattleTextBox>;

export default meta;
type Story = StoryObj<typeof meta>;

// As seis stories abaixo cobrem cada ramo de `buildMessage`.
export const Intro: Story = { args: { status: 'intro' } };
export const Anuncio: Story = { args: { beat: 'announce', turn: damageTurn } };
export const Dano: Story = { args: { beat: 'impact', turn: damageTurn } };
export const DanoMinimo: Story = { args: { beat: 'impact', turn: chipTurn } };
export const Derrota: Story = { args: { beat: 'impact', turn: defeatTurn } };
export const Vitoria: Story = { args: { status: 'finished', winnerName: pyrelisk.name } };

// No frame em que os dois coincidem, a derrota precisa vencer: uma reordenação
// dos ifs em `buildMessage` quebra esta story.
export const DerrotaComDanoMinimo: Story = {
  args: { beat: 'impact', turn: chipDefeatTurn },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(`${aquashell.name.toUpperCase()} foi derrotado!`)).toBeVisible();
  },
};
