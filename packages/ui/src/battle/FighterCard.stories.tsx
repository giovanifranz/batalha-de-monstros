import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { aquashell, pyrelisk } from '../testing/fixtures.ts';
import { FighterCard } from './FighterCard.tsx';

const longName = 'Pyrelisk Imperador das Chamas Eternas XI';

const arteQuebrada = 'data:image/png;base64,quebrada';

const card = (root: HTMLElement) => root.querySelector('article') as HTMLElement;

const hpFill = (root: HTMLElement) =>
  root.querySelector('[role="progressbar"]')?.firstElementChild as HTMLElement;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function expectArtFrameIs4by3(root: HTMLElement) {
  const frame = root.querySelector('[data-slot="art-frame"]') as HTMLElement;
  await expect(Math.abs(frame.offsetHeight - (frame.offsetWidth * 3) / 4)).toBeLessThan(1.5);
}

const meta = {
  component: FighterCard,
  args: { monster: pyrelisk, hp: pyrelisk.hp, side: 'left' },
} satisfies Meta<typeof FighterCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Parado: Story = {
  play: async ({ canvasElement }) => {
    await expect(hpFill(canvasElement)).toHaveClass('bg-hp-high');

    await expectArtFrameIs4by3(canvasElement);
  },
};

export const Atacando: Story = {
  args: { isAttacking: true },
  play: async ({ canvasElement }) => {
    const style = getComputedStyle(card(canvasElement));

    await expect(style.getPropertyValue('--tw-ring-color')).toBe(
      getComputedStyle(document.documentElement).getPropertyValue('--primary'),
    );
    await expect(style.animationName).toBe(reducedMotion() ? 'none' : 'lunge-right');
  },
};

export const SofrendoGolpe: Story = {
  args: { monster: aquashell, side: 'right', hp: 30, isTakingHit: true },
  play: async ({ canvasElement }) => {
    const article = card(canvasElement);
    const art = canvasElement.querySelector('img') as HTMLElement;

    await expect(getComputedStyle(article).rotate).toBe('1deg');

    const expected = reducedMotion() ? 'none' : 'hit-shake';
    await expect(getComputedStyle(article).animationName).toBe(expected);
    await expect(getComputedStyle(art).animationName).toBe(reducedMotion() ? 'none' : 'hit-flash');
  },
};

export const Derrotado: Story = {
  args: { hp: 0, isDefeated: true },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await expect(canvas.getByText(`0/${pyrelisk.hp}`)).toBeVisible();

    await expect(getComputedStyle(card(canvasElement)).animationName).toBe('defeat-drop');
  },
};

export const GolpeFatal: Story = {
  args: { hp: 0, isTakingHit: true, isDefeated: true },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(card(canvasElement)).animationName).toBe('defeat-drop');
  },
};

const hpAlertaValue = Math.round(pyrelisk.hp * 0.35);
const hpCriticoValue = Math.round(pyrelisk.hp * 0.1);

export const HpAlerta: Story = {
  args: { hp: hpAlertaValue },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String(hpAlertaValue),
    );
    await expect(hpFill(canvasElement)).toHaveClass('bg-hp-mid');
  },
};

export const HpCritico: Story = {
  args: { hp: hpCriticoValue },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String(hpCriticoValue),
    );
    await expect(hpFill(canvasElement)).toHaveClass('bg-hp-low');
  },
};

export const ArteQuebrada: Story = {
  args: { monster: { ...pyrelisk, imageUrl: arteQuebrada } },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-slot="art-fallback"]')).toBeVisible(),
    );

    await expectArtFrameIs4by3(canvasElement);
  },
};

export const NomeLongo: Story = {
  args: { monster: { ...pyrelisk, name: longName } },
  play: async ({ canvas }) => {
    const banner = canvas.getByRole('heading', { name: longName });

    await expect(banner.scrollWidth).toBeGreaterThan(banner.clientWidth);
  },
};
