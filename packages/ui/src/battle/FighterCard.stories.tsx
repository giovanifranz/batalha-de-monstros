import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { aquashell, pyrelisk } from '../testing/fixtures.ts';
import { FighterCard } from './FighterCard.tsx';

// Mais longo do que o schema deixa passar hoje, de propósito: o banner precisa
// aguentar o pior caso mesmo que o teto suba.
const nomeLongo = 'Pyrelisk Imperador das Chamas Eternas XI';

// `data:` inválida de propósito: falha ao decodificar sem tocar na rede.
const arteQuebrada = 'data:image/png;base64,quebrada';

const card = (root: HTMLElement) => root.querySelector('article') as HTMLElement;

const hpFill = (root: HTMLElement) =>
  root.querySelector('[role="progressbar"]')?.firstElementChild as HTMLElement;

// O runner pode rodar com `reduced-motion`, e as animações `motion-safe:` somem lá.
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A moldura da arte é 4:3 independente do conteúdo. Roda nas DUAS pontas porque
 * o bug do `min-height: auto` só aparece com a arte que CARREGA — o ícone de
 * fallback, de 40px, não estoura o mínimo.
 */
async function expectArtFrameIs4by3(root: HTMLElement) {
  const frame = root.querySelector('[data-slot="art-frame"]') as HTMLElement;
  // `offsetWidth/Height` e não `getBoundingClientRect()`: a carta é inclinada, e o
  // rect é o envelope alinhado aos eixos da caixa JÁ ROTACIONADA.
  await expect(Math.abs(frame.offsetHeight - (frame.offsetWidth * 3) / 4)).toBeLessThan(1.5);
}

const meta = {
  component: FighterCard,
  args: { monster: pyrelisk, hp: pyrelisk.hp, side: 'left' },
} satisfies Meta<typeof FighterCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Os quatro beats da carta ---------------------------------------------

/** Ocioso, HP cheio: também é o limiar `bg-hp-high` da barra. */
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

    // Comparar com o valor resolvido no documento mantém a asserção honesta se o tema mudar de tom.
    await expect(style.getPropertyValue('--tw-ring-color')).toBe(
      getComputedStyle(document.documentElement).getPropertyValue('--primary'),
    );
    await expect(style.animationName).toBe(reducedMotion() ? 'none' : 'lunge-right');
  },
};

// Do lado direito de propósito: é o único lugar em que a outra orientação aparece.
export const SofrendoGolpe: Story = {
  args: { monster: aquashell, side: 'right', hp: 30, isTakingHit: true },
  play: async ({ canvasElement }) => {
    const article = card(canvasElement);
    const art = canvasElement.querySelector('img') as HTMLElement;

    await expect(getComputedStyle(article).rotate).toBe('1deg');

    // Quem pisca é a ARTE: baixar a opacidade da carta derrubaria o contraste do texto.
    const expected = reducedMotion() ? 'none' : 'hit-shake';
    await expect(getComputedStyle(article).animationName).toBe(expected);
    await expect(getComputedStyle(art).animationName).toBe(reducedMotion() ? 'none' : 'hit-flash');
  },
};

export const Derrotado: Story = {
  args: { hp: 0, isDefeated: true },
  play: async ({ canvas, canvasElement }) => {
    // A barra e o numeral saem de `hp`, NUNCA de `monster.hp`.
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await expect(canvas.getByText(`0/${pyrelisk.hp}`)).toBeVisible();

    // `defeat-drop` é a única sem `motion-safe:`: é ela que carrega o estado final via `forwards`.
    await expect(getComputedStyle(card(canvasElement)).animationName).toBe('defeat-drop');
  },
};

// O golpe FATAL: os dois sinais no mesmo frame. Sem a precedência explícita do
// componente, as duas classes `animate-[…]` sobrevivem ao `cn()` e quem vence
// passa a ser a ordem do CSS, que se inverte sob `reduced-motion`.
export const GolpeFatal: Story = {
  args: { hp: 0, isTakingHit: true, isDefeated: true },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(card(canvasElement)).animationName).toBe('defeat-drop');
  },
};

// --- Os outros dois limiares de cor da barra de HP -------------------------

// Calculados a partir de `pyrelisk.hp`, não escritos como literal: a cor sai da
// FRAÇÃO do hp, e um hp de fixture novo mudaria a faixa exercitada.
const hpAlertaValue = Math.round(pyrelisk.hp * 0.35); // fração em (0.2, 0.5] → mid
const hpCriticoValue = Math.round(pyrelisk.hp * 0.1); // fração em [0, 0.2] → low

/** 35% do hp de Pyrelisk → dentro de (0.2, 0.5] → `bg-hp-mid`. */
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

/** 10% do hp de Pyrelisk → dentro de [0, 0.2] → `bg-hp-low`. */
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

// --- Casos de borda dos dados que o usuário digita -------------------------

// `image_url` é texto livre: link quebrado é o caso comum, não a exceção.
export const ArteQuebrada: Story = {
  args: { monster: { ...pyrelisk, imageUrl: arteQuebrada } },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-slot="art-fallback"]')).toBeVisible(),
    );

    // A outra ponta: sem arte, a moldura não pode encolher.
    await expectArtFrameIs4by3(canvasElement);
  },
};

export const NomeLongo: Story = {
  args: { monster: { ...pyrelisk, name: nomeLongo } },
  play: async ({ canvas }) => {
    const banner = canvas.getByRole('heading', { name: nomeLongo });

    // O banner corta com reticências: esticar a carta tiraria o `VS` do eixo.
    await expect(banner.scrollWidth).toBeGreaterThan(banner.clientWidth);
  },
};
