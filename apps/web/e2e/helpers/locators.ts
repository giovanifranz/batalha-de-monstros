import type { Locator, Page } from '@playwright/test';

/** Escapa metacaractere de regex: o cenário de cadastro digita o nome no formulário. */
function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * O card selecionável de um monstro no grid de `/battle` — só lá; na rota `/` o
 * card não é interativo e não tem nome acessível (ver `cardDoRoster`).
 *
 * A âncora é `<nome> HP` e não o início da string: o nome acessível GANHA o
 * prefixo "Lutador 1 …" quando o monstro é escalado, e o ` HP` é o que separa o
 * card do botão `Remover <nome>` do slot.
 */
export function cardDoMonstro(page: Page, nome: string): Locator {
  return page.getByRole('button', { name: new RegExp(`${escapar(nome)} HP\\b`) });
}

/**
 * O card de um monstro na rota `/`, onde ele é um `<div>` sem `role` nem nome
 * acessível — não há `getByRole` para alcançá-lo. O `data-slot="card"` vem do
 * componente `Card` do shadcn, não é um `data-testid` posto para o teste.
 */
export function cardDoRoster(page: Page, nome: string): Locator {
  return page.locator('[data-slot="card"]').filter({ hasText: nome });
}

/**
 * Quantos cards o grid está mostrando, contando os botões de excluir. A regex
 * exige o nome DEPOIS de "Excluir" para não pegar a ação do diálogo.
 *
 * VALE SÓ COM O DIÁLOGO FECHADO: aberto, o Radix marca o resto da árvore com
 * `aria-hidden` e esta contagem vai a ZERO.
 */
export function cardsVisiveis(page: Page): Locator {
  return page.getByRole('button', { name: /^Excluir .+/ });
}
