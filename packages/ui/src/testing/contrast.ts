/**
 * Contraste WCAG medido no DOM vivo, inclusive em estados que o axe não alcança
 * — hoje `:hover`, que o axe nunca vê porque não passa o mouse.
 *
 * O hover é RESOLVIDO no CSSOM, e não simulado: o `userEvent` do
 * `storybook/test` é sintético, `elemento.matches(':hover')` continua `false`, e
 * uma story que "hoverasse" mediria o estado de repouso e passaria sempre.
 *
 * A conversão de cor e a composição saem de um `<canvas>`: o `fillStyle` aceita
 * qualquer sintaxe do CSS (`oklch()`, `color-mix()`) e o `source-over` é a mesma
 * composição que o navegador faz para um fundo translúcido.
 */

function context(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d indisponível');

  return ctx;
}

function paint(colors: readonly string[]): [number, number, number] {
  const ctx = context();
  // Base branca só para não sobrar alfa: a pilha sempre começa por um fundo opaco.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1, 1);
  for (const color of colors) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
  }
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

  return [r, g, b];
}

/**
 * O alfa de uma cor CSS qualquer, lido do pixel — não por regex sobre
 * `backgroundColor`: num tema oklch o valor computado sai como `oklab(... / 0.2)`
 * e uma regex de `rgba()` leria alfa 1.
 */
function alphaOf(color: string): number {
  const ctx = context();
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);

  return ctx.getImageData(0, 0, 1, 1).data[3] / 255;
}

function* everyStyleRule(rules: CSSRuleList): Generator<CSSStyleRule> {
  for (const rule of rules) {
    // Ordem importa: um `CSSStyleRule` TAMBÉM tem `cssRules` (aninhamento nativo),
    // então testar "tem cssRules?" primeiro engoliria toda regra de estilo.
    if (rule instanceof CSSStyleRule) {
      yield rule;
      yield* everyStyleRule(rule.cssRules);
      continue;
    }

    // O Tailwind 4 emite `hover:` dentro de `@media (hover: hover)` mais um `@supports`.
    if ('cssRules' in rule) yield* everyStyleRule((rule as CSSGroupingRule).cssRules);
  }
}

/**
 * Resolve um valor DECLARADO (`var(--destructive)`, `color-mix(…)`) para uma cor
 * concreta: o `fillStyle` do canvas ignora em silêncio o que não entende, e um
 * `var()` cru fazia a medição sair 1.00 em vez de falhar alto. A sonda é FILHA do
 * elemento para as custom properties herdadas resolverem com os valores de lá.
 */
function computeAgainst(element: Element, property: string, declared: string): string {
  const probe = document.createElement('span');
  probe.style.setProperty('display', 'none');
  probe.style.setProperty(property, declared);
  element.appendChild(probe);
  const computed = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();

  return computed;
}

/**
 * `:hover` que NÃO está escapado dentro de um nome de classe. O lookbehind é o
 * que separa o pseudo real (`…:is(.dark *):hover`) do pedaço escapado que faz
 * parte do nome do utilitário (`.dark\:hover\:bg-…`).
 */
const UNESCAPED_HOVER = /(?<!\\):hover/g;

/**
 * O valor que `property` teria em `element` com `pseudo` ativo, ou `null`. Todos
 * os seletores do Tailwind têm a mesma especificidade, então quem vence é o
 * ÚLTIMO na ordem do documento.
 */
function resolvePseudo(element: Element, pseudo: string, property: string): string | null {
  let winner: string | null = null;

  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // folha de outra origem
    }

    for (const rule of everyStyleRule(rules)) {
      if (!rule.selectorText.includes(pseudo)) continue;

      const declared = rule.style.getPropertyValue(property);
      if (!declared) continue;

      // SÓ o pseudo não escapado: o nome da classe de um utilitário composto
      // carrega o pseudo escapado dentro de si
      // (`.dark\:hover\:bg-destructive\/20:is(.dark *):hover`), e um
      // `replaceAll(':hover', '')` corrompe o seletor.
      const withoutPseudo = rule.selectorText.replace(UNESCAPED_HOVER, '');

      // Sem `catch` silencioso: um seletor que o `matches` recusa é um seletor que
      // este helper NÃO está medindo.
      let casa: boolean;
      try {
        casa = element.matches(withoutPseudo);
      } catch (error) {
        throw new Error(
          `textContrast: não consegui avaliar o seletor ${JSON.stringify(rule.selectorText)} ` +
            `(reduzido para ${JSON.stringify(withoutPseudo)}). ` +
            `Uma regra descartada em silêncio é uma medição otimista.`,
          { cause: error },
        );
      }

      if (casa) winner = computeAgainst(element, property, declared);
    }
  }

  return winner;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Os fundos pintados atrás de `element`, do mais distante para o mais próximo.
 * Para no primeiro fundo OPACO. `ownBackground` substitui o fundo do PRÓPRIO
 * elemento; o resto da pilha é o repouso dos ancestrais.
 */
function backgroundStack(element: Element, ownBackground?: string | null): string[] {
  const stack: string[] = [];

  for (let node: Element | null = element; node; node = node.parentElement) {
    const background =
      node === element && ownBackground ? ownBackground : getComputedStyle(node).backgroundColor;
    const alpha = alphaOf(background);
    if (alpha === 0) continue;

    stack.unshift(background);
    if (alpha === 1) break;
  }

  return stack;
}

type Options = {
  /** Mede o elemento como se este pseudo-estado estivesse ativo. */
  pseudo?: ':hover';
};

/**
 * Razão de contraste entre o texto de `element` e o fundo composto atrás dele.
 * Arredonda para duas casas, o mesmo que o axe usa ao relatar.
 */
export function textContrast(element: Element, { pseudo }: Options = {}): number {
  const own = pseudo ? resolvePseudo(element, pseudo, 'background-color') : null;
  const color = pseudo
    ? (resolvePseudo(element, pseudo, 'color') ?? getComputedStyle(element).color)
    : getComputedStyle(element).color;

  const backgrounds = backgroundStack(element, own);
  const background = paint(backgrounds);
  const foreground = paint([...backgrounds, color]);

  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [high, low] = a > b ? [a, b] : [b, a];

  return Math.round(((high + 0.05) / (low + 0.05)) * 100) / 100;
}

/** O mínimo da AA para texto normal. */
export const AA_NORMAL_TEXT = 4.5;
