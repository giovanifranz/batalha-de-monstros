/**
 * Roda o axe contra o APP EM EXECUÇÃO, só em desenvolvimento — cobre os estados
 * compostos que nenhuma story renderiza. `axe-core` direto e não
 * `@axe-core/react`: o adaptador depende de `ReactDOM.findDOMNode`, removido no
 * React 19, e roda uma única análise contra um `#root` ainda vazio.
 *
 * FALSO POSITIVO CONHECIDO: trocar de tema SEM recarregar produz violações de
 * `color-contrast` inexistentes — `transition-colors` interpola o `color` do
 * tema anterior sobre o fundo do novo. Recarregue antes de acreditar no achado.
 */

const DEBOUNCE_MS = 1000;

/**
 * Chaves `regra|alvo` já reportadas, para não repetir no console. ZERADO A CADA
 * NAVEGAÇÃO: uma chave eterna silenciaria a reaparição legítima da violação, e o
 * seletor estrutural muda de valor quando o elemento troca de posição.
 */
const reported = new Set<string>();

export async function startAxeInDevelopment(): Promise<void> {
  if (!import.meta.env.DEV) return;

  const axe = (await import('axe-core')).default;

  let timer: number | undefined;
  let running = false;
  /** Mutação que chegou durante uma análise em voo. Ver `analyse`. */
  let pendente = false;
  let ultimaRota = location.pathname;

  async function analyse() {
    // O axe recusa duas execuções simultâneas. Marcar e reagendar, não descartar:
    // uma rota que termina de montar fica quieta logo depois.
    if (running) {
      pendente = true;
      return;
    }
    running = true;

    try {
      const { violations } = await axe.run(document, { reporter: 'v2' });

      for (const violation of violations) {
        const novos = violation.nodes.filter((node) => {
          const key = `${violation.id}|${node.target.join(' ')}`;
          if (reported.has(key)) return false;

          reported.add(key);
          return true;
        });

        if (novos.length === 0) continue;

        console.warn(
          `[axe] ${violation.impact}: ${violation.help}\n${violation.helpUrl}`,
          novos.map((node) => ({ alvo: node.target.join(' '), resumo: node.failureSummary })),
        );
      }
    } catch (error) {
      console.error('[axe] falhou ao analisar a página:', error);
    } finally {
      running = false;
      if (pendente) {
        pendente = false;
        schedule();
      }
    }
  }

  function schedule() {
    // Rota nova: os seletores estruturais da anterior não dizem mais nada.
    if (location.pathname !== ultimaRota) {
      ultimaRota = location.pathname;
      reported.clear();
    }

    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      // Com teto: numa página que nunca fica ociosa, `requestIdleCallback` sozinho não roda.
      window.requestIdleCallback(() => void analyse(), { timeout: 2000 });
    }, DEBOUNCE_MS);
  }

  new MutationObserver(schedule).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
  });

  // Primeira passada: o observer só dispara na PRÓXIMA mudança.
  schedule();
}
