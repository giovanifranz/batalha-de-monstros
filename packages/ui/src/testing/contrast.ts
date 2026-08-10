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
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1, 1);
  for (const color of colors) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
  }
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

  return [r, g, b];
}

function alphaOf(color: string): number {
  const ctx = context();
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);

  return ctx.getImageData(0, 0, 1, 1).data[3] / 255;
}

function* everyStyleRule(rules: CSSRuleList): Generator<CSSStyleRule> {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      yield rule;
      yield* everyStyleRule(rule.cssRules);
      continue;
    }

    if ('cssRules' in rule) yield* everyStyleRule((rule as CSSGroupingRule).cssRules);
  }
}

function computeAgainst(element: Element, property: string, declared: string): string {
  const probe = document.createElement('span');
  probe.style.setProperty('display', 'none');
  probe.style.setProperty(property, declared);
  element.appendChild(probe);
  const computed = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();

  return computed;
}

const UNESCAPED_HOVER = /(?<!\\):hover/g;

function resolvePseudo(element: Element, pseudo: string, property: string): string | null {
  let winner: string | null = null;

  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }

    for (const rule of everyStyleRule(rules)) {
      if (!rule.selectorText.includes(pseudo)) continue;

      const declared = rule.style.getPropertyValue(property);
      if (!declared) continue;

      const withoutPseudo = rule.selectorText.replace(UNESCAPED_HOVER, '');

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
  pseudo?: ':hover';
};

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

export const AA_NORMAL_TEXT = 4.5;
